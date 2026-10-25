import { logger } from '../../../lib/logger';
import { ICustomizableTable, ICustomizationState, IMessage } from '../models/InterviewTypes';
import {
  InterviewSessionConflictError,
  InterviewSessionNotFoundError,
} from '../models/InterviewSession.model';
import type { IInterviewSessionRepository } from '../repositories/IInterviewSessionRepository';
import { presetService } from '../../dynamicTables/services/PresetService';
import { computeTableLocks } from '../../dynamicTables/presets/removability';
import { CoreSystemPreset } from '../../dynamicTables/presets';
import { MODULE_REGISTRY, moduleOfTable, type ModuleKey } from '../../dynamicTables/presets/modules/registry';
import type { ISchemaField } from '../../dynamicTables/models/DynamicTable.model';
import { ADDED_TABLE_KEY_PATTERN } from '../../dynamicTables/dtos/CreateDashboard.dto';
import { composeSessionTables } from './sessionComposition';

/**
 * W1 (dono, questionário 2026-10-24: "Nasce com 'Nome'"): o create recusa tabela sem campo, então a tabela criada na
 * conversa já nasce com este campo texto obrigatório.
 */
export const ADDED_TABLE_DEFAULT_FIELD: ISchemaField = { name: 'name', label: 'Nome', type: 'string', required: true };

/** W1: chave da tabela criada na conversa no formato que o `AddedTableSchema` do create aceita (ou `null`). */
export function addedTableKey(tableName: string): string | null {
  const key = tableName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return ADDED_TABLE_KEY_PATTERN.test(key) ? key : null;
}

/** F-W4-3 a: TTL de 24 h, deslizante — renovado a cada gravação. */
export const INTERVIEW_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Sessão carregada para um turno. `version` é a versão que o turno leu; cada gravação exige que a linha ainda esteja
 * nela e avança junto (F-W4-4 a) — outro turno que gravou no meio vira `InterviewSessionConflictError`.
 */
export interface IInterviewSessionHandle {
  id: string;
  userId: string;
  version: number;
  state: ICustomizationState;
}

/**
 * BE-INCR-INTERVIEW-SESSION (nó W4, itens 3–4 e 12): estado da customização persistido em `InterviewSession`,
 * no lugar do `Record` em memória (R28). Carregar → mutar → salvar: o serviço carrega a sessão uma vez por turno
 * (`loadSession`) e cada método que muta grava na hora (`saveSession`), com a versão lida no início do turno.
 */
export class StateManager {
  constructor(
    private readonly repository: IInterviewSessionRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private expiresAt(): Date {
    return new Date(this.now().getTime() + INTERVIEW_SESSION_TTL_MS);
  }

  /**
   * Cria e persiste um novo estado de customização. O id é o da linha (nunca vem do cliente).
   */
  public async createSessionState(
    userId: string,
    presetKey: string,
    presetName: string,
    tables: ICustomizableTable[],
    modules?: ModuleKey[],
  ): Promise<IInterviewSessionHandle> {
    const state: ICustomizationState = {
      presetKey,
      presetName,
      tables: tables.map(table => ({ ...table, conversationHistory: [] })),
      customMessages: [],
      isCompleted: false,
      ...(modules ? { modules } : {}),
    };
    const row = await this.repository.create({ userId, presetKey, state, expiresAt: this.expiresAt() });
    logger.info(`[StateManager] Sessão de customização ${row.id} criada para ${presetName}`);
    return { id: row.id, userId, version: row.version, state: row.state };
  }

  /**
   * Carrega a sessão ativa do usuário. Inexistente, expirada, apagada ou de outro usuário → 404 (mesma resposta).
   */
  public async loadSession(sessionId: string, userId: string): Promise<IInterviewSessionHandle> {
    const row = await this.repository.findActive(sessionId, userId, this.now());
    if (!row) {
      logger.warn(`[StateManager] Sessão ${sessionId} não encontrada para o usuário`);
      throw new InterviewSessionNotFoundError();
    }
    return { id: row.id, userId, version: row.version, state: row.state };
  }

  /**
   * Grava o estado com a versão do turno e renova o TTL. Nada gravado → a sessão sumiu (404) ou outro turno gravou
   * antes (409).
   */
  public async saveSession(session: IInterviewSessionHandle): Promise<void> {
    const now = this.now();
    const saved = await this.repository.saveState({
      id: session.id,
      userId: session.userId,
      expectedVersion: session.version,
      state: session.state,
      expiresAt: new Date(now.getTime() + INTERVIEW_SESSION_TTL_MS),
      now,
    });
    if (!saved) {
      const current = await this.repository.findActive(session.id, session.userId, now);
      if (!current) throw new InterviewSessionNotFoundError();
      logger.warn(`[StateManager] Conflito de versão na sessão ${session.id} (${session.version} → ${current.version})`);
      throw new InterviewSessionConflictError();
    }
    session.version += 1;
  }

  /**
   * Adiciona uma mensagem ao histórico de customização
   */
  public async addCustomizationMessage(session: IInterviewSessionHandle, message: IMessage): Promise<void> {
    session.state.customMessages.push(message);
    await this.saveSession(session);
  }

  /**
   * Adiciona uma nova tabela ao estado da customização
   */
  public async addTable(session: IInterviewSessionHandle, tableName: string, description: string): Promise<boolean> {
    const state = session.state;
    // W1 (F-W1-4 a): a chave vai ao create (`addedTables[].key`), então segue o formato dele; nome sem letra → recusa.
    const key = addedTableKey(tableName);
    if (!key) {
      logger.warn(`[StateManager] Nome de tabela sem chave válida na sessão ${session.id}`);
      return false;
    }

    // Verifica se já existe uma tabela com essa chave (na sessão, no Core ou num módulo — o create recusaria)
    if (state.tables.some(t => t.key === key) || key in CoreSystemPreset.tables || moduleOfTable(key)) {
      logger.warn(`[StateManager] Tabela com chave ${key} já existe na sessão ${session.id}`);
      return false;
    }

    state.tables.push({
      name: tableName,
      key,
      description,
      isSelected: true,
      isCore: false, // Tabelas adicionadas pelo usuário não são essenciais por padrão
      fields: [{ ...ADDED_TABLE_DEFAULT_FIELD }],
      conversationHistory: [], // Inicializa o histórico da conversa para a nova tabela
    });
    await this.saveSession(session);

    logger.info(`[StateManager] Tabela ${tableName} adicionada à sessão ${session.id}`);
    return true;
  }

  /**
   * Remove uma tabela do estado da customização
   */
  public async removeTable(session: IInterviewSessionHandle, tableKey: string): Promise<boolean> {
    const state = session.state;
    const tableIndex = state.tables.findIndex(t =>
      t.key === tableKey || t.name.toLowerCase() === tableKey.toLowerCase()
    );

    if (tableIndex === -1) {
      logger.warn(`[StateManager] Tabela ${tableKey} não encontrada na sessão ${session.id}`);
      return false;
    }

    // Verifica se a tabela é essencial
    if (state.tables[tableIndex].isCore) {
      logger.warn(`[StateManager] Tentativa de remover tabela essencial ${tableKey} na sessão ${session.id}`);
      return false;
    }

    // W1 (F-W1-5 a): tabela de módulo não-fixo sai com o módulo inteiro (módulo fixo já está travado acima); a
    // resposta da conversa avisa (`CustomizationService.processRemovingTable`).
    const target = state.tables[tableIndex];
    const moduleKey = moduleOfTable(target.key);
    if (moduleKey && target.lock !== undefined && state.modules?.includes(moduleKey)) {
      const dependents = state.modules.filter((k) => MODULE_REGISTRY[k].dependsOn.includes(moduleKey));
      if (dependents.length > 0) {
        logger.warn(`[StateManager] Módulo ${moduleKey} tem dependentes (${dependents.join(', ')}) na sessão ${session.id}`);
        return false;
      }
      const moduleTables = new Set(MODULE_REGISTRY[moduleKey].tables);
      state.tables = state.tables.filter((t) => !(moduleTables.has(t.key) && t.lock !== undefined));
      state.modules = state.modules.filter((k) => k !== moduleKey);
    } else {
      state.tables.splice(tableIndex, 1);
    }
    this.refreshLocks(state);
    await this.saveSession(session);
    logger.info(`[StateManager] Tabela ${tableKey} removida da sessão ${session.id}`);
    return true;
  }

  /**
   * W1 (F-W1-6 a + sincronização): troca os módulos da sessão. Tabelas de módulo que saiu são retiradas; as do módulo
   * que entrou chegam em `addedTables` (já extraídas pelo serviço); o resto da customização fica como está.
   */
  public async setModules(
    session: IInterviewSessionHandle,
    modules: ModuleKey[],
    addedTables: ICustomizableTable[],
  ): Promise<void> {
    const state = session.state;
    const preset = presetService.getPresetByKey(state.presetKey);
    const presetKeys = new Set(Object.keys(preset?.tables ?? {}));
    state.tables = state.tables.filter((t) => {
      const owner = moduleOfTable(t.key);
      return t.lock === undefined || presetKeys.has(t.key) || !owner || modules.includes(owner);
    });
    const present = new Set(state.tables.map((t) => t.key));
    for (const t of addedTables) {
      if (!present.has(t.key)) state.tables.push({ ...t, conversationHistory: [] });
    }
    state.modules = modules;
    this.refreshLocks(state);
    await this.saveSession(session);
    logger.info(`[StateManager] Módulos da sessão ${session.id}: ${modules.join(', ') || 'nenhum'}`);
  }

  /**
   * W2 item 5 (F-W2-1 → trava dinâmica): recalcula `lock`/`isCore` das tabelas que vieram do preset sobre o que
   * sobrou na sessão. Tabela adicionada pelo usuário (sem `lock`) não entra.
   */
  private refreshLocks(state: ICustomizationState): void {
    const preset = presetService.getPresetByKey(state.presetKey);
    if (!preset) return;
    // W1 (F-W1-6 a): as tabelas dos módulos da sessão entram na mesma regra de trava.
    const known = composeSessionTables(preset, state.modules ?? []);
    const fromPreset = state.tables.filter((t) => t.lock !== undefined && t.key in known);
    const locks = computeTableLocks(known, new Set(fromPreset.map((t) => t.key)));
    for (const t of fromPreset) {
      t.lock = locks[t.key];
      t.isCore = t.lock !== null;
    }
  }

  /**
   * Gera um resumo do estado atual da customização para ser usado como contexto para a IA
   */
  public getCustomizationSummary(state: ICustomizationState): string {
    const tableSummary = state.tables.map(t =>
      `- ${t.name} (${t.isCore ? 'Essencial' : 'Customizada'})`
    ).join('\n');

    return `O sistema atualmente possui as seguintes tabelas:\n${tableSummary}`;
  }

  /**
   * Define o estado atual da customização
   */
  public async setCurrentAction(session: IInterviewSessionHandle, action: 'adding' | 'removing' | null): Promise<void> {
    session.state.currentAction = action;
    await this.saveSession(session);
    logger.info(`[StateManager] Ação definida para ${action} na sessão ${session.id}`);
  }

  /**
   * Marca a customização como concluída. A sessão continua ativa: o consumo/soft-delete é do W1 (item 8).
   */
  public async completeCustomization(session: IInterviewSessionHandle): Promise<void> {
    session.state.isCompleted = true;
    session.state.currentAction = null;
    await this.saveSession(session);
    logger.info(`[StateManager] Customização da sessão ${session.id} marcada como concluída`);
  }

  /**
   * Gera um relatório textual completo do estado atual da customização
   */
  public getCustomizationReport(state: ICustomizationState): string {
    const tables = state.tables
      .map(t => `- ${t.name}: ${t.description} (${t.isCore ? 'essencial' : 'opcional'})`)
      .join('\n');

    return `
# Estado atual da customização do sistema ${state.presetName}

## Tabelas incluídas:
${tables}

## Ação atual: ${state.currentAction || 'nenhuma'}
## Status: ${state.isCompleted ? 'Concluído' : 'Em andamento'}
    `;
  }

  /**
   * Atualiza as tabelas de uma sessão de customização
   */
  public async updateTables(session: IInterviewSessionHandle, tables: ICustomizableTable[]): Promise<void> {
    session.state.tables = tables;
    await this.saveSession(session);
    logger.info(`[StateManager] Tabelas atualizadas na sessão ${session.id}`);
  }
}
