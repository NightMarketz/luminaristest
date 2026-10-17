import { randomUUID } from 'crypto';
import type OpenAI from 'openai';
import { logger } from '../../../lib/logger';
import type { OpenAIService } from '../../../lib/openai/OpenAIService';
import { fieldPresetKnowledgeBase } from '../../dynamicTables/presets/fields/FieldPresetKnowledgeBase';
import type { ICustomizableTable } from '../models/InterviewTypes';
import type { IInterviewSessionHandle, StateManager } from '../CustomizationService/StateManager';
import type {
  CustomizeFieldsDecisionDto,
  CustomizeFieldsDtoType,
  CustomizeFieldsMessageDto,
} from '../dtos/CustomizeFields.dto';
import { FieldPresetMatcher } from './FieldPresetMatcher';
import { buildFieldChanges, requiresSensitiveAck } from './FieldProposal';
import { FieldUpdater } from './FieldUpdater';
import { buildFieldCustomizationResponseFormat, parseModelOutput } from './ModelOutput';
import { promptConfig } from './PromptConfig';
import { ProposalStaleError, SensitiveFieldNotAcknowledgedError, TableNotInSessionError } from './errors';
import type { DiscardedChange, IFieldHistoryEntry, IFieldProposal } from './Types';

/** Item 5: quantas mensagens da tabela vão ao modelo (as `system` nunca vão). */
const MODEL_HISTORY_LIMIT = 20;

/** Resposta `200` da rota (BRIEF WIZARD-W6 §2.2). */
export interface CustomizeFieldsResult {
  sessionId: string;
  tableKey: string;
  /** Estado da tabela na sessão DEPOIS do turno (inalterado em `message`). */
  table: ICustomizableTable;
  conversationHistory: IFieldHistoryEntry[];
  proposal: IFieldProposal | null;
  discarded: DiscardedChange[];
  /** Só em `kind:'decision'`. */
  applied?: boolean;
}

/**
 * BE-INCR-W6-CUSTOMIZE-FIELDS (nó W6; BRIEF WIZARD-W6 itens 1–11; ADR-W6 Accepted 15/10).
 *
 * Painel de campos da entrevista sobre a `InterviewSession` do W4: o turno `message` faz UMA chamada ao modelo com
 * saída presa a schema e devolve uma proposta, nunca aplica; o turno `decision` aplica ou descarta a proposta pendente,
 * de forma determinística, na mesma gravação da sessão. Invariantes no ADR-W6 §2.2.
 */
export class FieldCustomizationService {
  constructor(
    private readonly stateManager: StateManager,
    private readonly openaiService: OpenAIService,
    private readonly presetMatcher: FieldPresetMatcher = new FieldPresetMatcher(),
    private readonly fieldUpdater: FieldUpdater = new FieldUpdater(),
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = randomUUID,
  ) {}

  public handle(userId: string, dto: CustomizeFieldsDtoType): Promise<CustomizeFieldsResult> {
    return dto.kind === 'message' ? this.processMessage(userId, dto) : this.processDecision(userId, dto);
  }

  /** Itens 3–9 e 11. */
  public async processMessage(userId: string, dto: CustomizeFieldsMessageDto): Promise<CustomizeFieldsResult> {
    const session = await this.stateManager.loadSession(dto.sessionId, userId);
    const table = this.findTable(session, dto.tableKey);

    let content: string | null;
    try {
      content = await this.openaiService.completeWithJsonSchema(
        this.buildModelMessages(table, dto.message),
        buildFieldCustomizationResponseFormat(this.presetMatcher.presetKeys()),
      );
    } catch (error) {
      // Item 11: a conversa segue — 200 sem proposta, nunca 500.
      logger.error(`[FieldCustomizationService] Erro do modelo na sessão ${session.id}: ${error}`);
      return this.recordFailedTurn(session, table, dto.message, promptConfig.MODEL_ERROR_MESSAGE);
    }

    const output = parseModelOutput(content);
    if (!output) {
      logger.warn(`[FieldCustomizationService] Resposta do modelo fora do schema na sessão ${session.id}`);
      return this.recordFailedTurn(session, table, dto.message, promptConfig.NOT_UNDERSTOOD_MESSAGE);
    }

    const { changes, discarded } = buildFieldChanges(output.changes, table.fields ?? [], this.presetMatcher);
    const at = this.now().toISOString();
    this.appendHistory(table, { role: 'user', content: dto.message, at }, { role: 'assistant', content: output.friendlyMessage, at });

    // Item 7: a nova proposta substitui a anterior; turno sem mudança válida limpa a pendente (dono, 16/10).
    let proposal: IFieldProposal | null = null;
    if (changes.length > 0) {
      table.pendingProposal = { id: this.newId(), changes, createdAt: at };
      proposal = { id: table.pendingProposal.id, changes, requiresSensitiveAck: requiresSensitiveAck(changes) };
    } else {
      delete table.pendingProposal;
    }

    await this.stateManager.saveSession(session);
    return this.result(session, table, proposal, discarded);
  }

  /** Item 10. */
  public async processDecision(userId: string, dto: CustomizeFieldsDecisionDto): Promise<CustomizeFieldsResult> {
    const session = await this.stateManager.loadSession(dto.sessionId, userId);
    const table = this.findTable(session, dto.tableKey);

    const pending = table.pendingProposal;
    if (!pending || pending.id !== dto.proposalId) throw new ProposalStaleError();

    const apply = dto.decision === 'apply';
    if (apply) {
      if (requiresSensitiveAck(pending.changes) && dto.acknowledgeSensitive !== true) {
        throw new SensitiveFieldNotAcknowledgedError();
      }
      table.fields = this.fieldUpdater.update(table.fields ?? [], pending.changes);
    }
    delete table.pendingProposal;
    this.appendHistory(table, {
      role: 'system',
      content: apply ? promptConfig.PROPOSAL_APPLIED : promptConfig.PROPOSAL_DISCARDED,
      at: this.now().toISOString(),
    });

    await this.stateManager.saveSession(session);
    return { ...this.result(session, table, null, []), applied: apply };
  }

  private findTable(session: IInterviewSessionHandle, tableKey: string): ICustomizableTable {
    const table = session.state.tables.find((t) => t.key === tableKey);
    if (!table) throw new TableNotInSessionError();
    return table;
  }

  /**
   * Itens 6 e 11 (dono, 16/10): falha do modelo grava a linha do usuário e a mensagem padrão do assistente; campos e
   * proposta pendente ficam como estavam.
   */
  private async recordFailedTurn(
    session: IInterviewSessionHandle,
    table: ICustomizableTable,
    message: string,
    assistantMessage: string,
  ): Promise<CustomizeFieldsResult> {
    const at = this.now().toISOString();
    this.appendHistory(table, { role: 'user', content: message, at }, { role: 'assistant', content: assistantMessage, at });
    await this.stateManager.saveSession(session);
    return this.result(session, table, null, []);
  }

  private appendHistory(table: ICustomizableTable, ...entries: IFieldHistoryEntry[]): void {
    table.conversationHistory = [...(table.conversationHistory ?? []), ...entries];
  }

  private result(
    session: IInterviewSessionHandle,
    table: ICustomizableTable,
    proposal: IFieldProposal | null,
    discarded: CustomizeFieldsResult['discarded'],
  ): CustomizeFieldsResult {
    return {
      sessionId: session.id,
      tableKey: table.key,
      table,
      conversationHistory: table.conversationHistory,
      proposal,
      discarded,
    };
  }

  /** Item 5: só `user`/`assistant` vão ao modelo, as últimas 20 da tabela, mais a mensagem do turno. */
  private buildModelMessages(
    table: ICustomizableTable,
    userMessage: string,
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const history = (table.conversationHistory ?? [])
      .filter((m): m is IFieldHistoryEntry & { role: 'user' | 'assistant' } => m.role === 'user' || m.role === 'assistant')
      .slice(-MODEL_HISTORY_LIMIT)
      .map((m) => ({ role: m.role, content: m.content }));
    return [{ role: 'system', content: this.systemPrompt(table) }, ...history, { role: 'user', content: userMessage }];
  }

  private systemPrompt(table: ICustomizableTable): string {
    const fields = (table.fields ?? [])
      .map((f) => `- ${f.label} (${f.name}): tipo ${f.type}${f.required ? ', obrigatório' : ''}`)
      .join('\n');
    const catalog = fieldPresetKnowledgeBase.map((p) => `- ${p.key} (${p.type}): ${p.aiDescription}`).join('\n');
    // Substituição por função: nome/descrição vêm do usuário, e `$&`/`$'` numa string seriam lidos como padrão.
    return promptConfig.FIELD_CUSTOMIZATION_PROMPT.replace('{{TABLE_NAME}}', () => table.name)
      .replace('{{TABLE_DESCRIPTION}}', () => table.description)
      .replace('{{TABLE_FIELDS}}', () => fields || '(nenhum)')
      .replace('{{PRESET_CATALOG}}', () => catalog);
  }
}
