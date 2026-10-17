import { logger } from '../../../lib/logger';
import { ICustomizableTable, ICustomizationState, IMessage } from '../models/InterviewTypes';
import {
  InterviewSessionConflictError,
  InterviewSessionNotFoundError,
} from '../models/InterviewSession.model';
import type { IInterviewSessionRepository } from '../repositories/IInterviewSessionRepository';
import { presetService } from '../../dynamicTables/services/PresetService';
import { computeTableLocks } from '../../dynamicTables/presets/removability';

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
  ): Promise<IInterviewSessionHandle> {
    const state: ICustomizationState = {
      presetKey,
      presetName,
      tables: tables.map(table => ({ ...table, conversationHistory: [] })),
      customMessages: [],
      isCompleted: false,
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
    // Gera uma chave a partir do nome da tabela
    // BUG FIX (R28): /\\s+/g had a literal backslash and never matched whitespace. Fixed to /\s+/g.
    const key = tableName.toLowerCase().replace(/\s+/g, '_');

    // Verifica se já existe uma tabela com essa chave
    if (state.tables.some(t => t.key === key)) {
      logger.warn(`[StateManager] Tabela com chave ${key} já existe na sessão ${session.id}`);
      return false;
    }

    state.tables.push({
      name: tableName,
      key,
      description,
      isSelected: true,
      isCore: false, // Tabelas adicionadas pelo usuário não são essenciais por padrão
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

    state.tables.splice(tableIndex, 1);
    this.refreshLocks(state);
    await this.saveSession(session);
    logger.info(`[StateManager] Tabela ${tableKey} removida da sessão ${session.id}`);
    return true;
  }

  /**
   * W2 item 5 (F-W2-1 → trava dinâmica): recalcula `lock`/`isCore` das tabelas que vieram do preset sobre o que
   * sobrou na sessão. Tabela adicionada pelo usuário (sem `lock`) não entra.
   */
  private refreshLocks(state: ICustomizationState): void {
    const preset = presetService.getPresetByKey(state.presetKey);
    if (!preset) return;
    const fromPreset = state.tables.filter((t) => t.lock !== undefined && t.key in preset.tables);
    const locks = computeTableLocks(preset.tables, new Set(fromPreset.map((t) => t.key)));
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
