import { formatInTimeZone } from 'date-fns-tz';
import type OpenAI from 'openai';
import type { Prisma } from 'generated/prisma';
import type { UserContext } from '../../../lib/authUtils';
import type { LlmMessage, LlmProviderId, LlmToolCall, LlmToolDef } from '../../../lib/llm/LlmProvider';
import type { LlmUsage } from '../../../lib/openai/llmUsage';
import { toTurnUsage } from '../../../lib/openai/llmUsage';
import { NotFoundError } from '../../../lib/errors';
import { wrapUntrustedData } from '../../../lib/untrustedData';
import { agentToolError, type AgentToolError } from '../../chat/models/AgentTool.model';
import type { IActionProposalRepository } from '../../chat/repositories/IActionProposalRepository';
import type { IDynamicTable } from '../../dynamicTables/models/DynamicTable.model';
import { ProposalPayloadSchema } from '../dtos/TeammatesDto';
import { TOOL_CLASS, type ActionClass } from '../models/ActionClass.model';
import {
  MAX_TOOL_ROUNDS,
  TURN_ROUND_LIMIT_WARNING,
  TeammateTurnError,
  type AgentTurnFinish,
  type IAgentTurn,
  type ITurnChannelMessage,
} from '../models/AgentTurn.model';
import type { ITeammate } from '../models/Teammate.model';
import type { IAgentTurnRepository, ITurnContextRepository } from '../repositories/IAgentTurnRepository';
import type { ITeammateRepository } from '../repositories/ITeammateRepository';
import type { TeammateLlmConfig, TeammateLlmResult } from './TeammateLlmCaller';

/** O laço de ferramentas do chat (`LuminarisAgentService`), pelo serviço: o registro e a execução das ferramentas. */
export interface ITeammateToolHost {
  getTools(): Promise<OpenAI.Chat.Completions.ChatCompletionTool[]>;
  handleToolCall(user: UserContext, functionName: string, args: Record<string, unknown>): Promise<unknown>;
}

/** O que a proposta de linha precisa da tabela (mesmas checagens do `LuminarisAgentService` antes de gravar). */
export interface ITeammateProposalTables {
  getTableById(user: UserContext, tableId: string): Promise<IDynamicTable>;
  getTableDataByIds(user: UserContext, tableId: string, recordIds: string[]): Promise<unknown[]>;
  canManageData(user: UserContext, table: IDynamicTable): boolean;
}

export interface ITeammateLlm {
  complete(
    userId: string,
    teammate: TeammateLlmConfig,
    request: { messages: LlmMessage[]; tools?: LlmToolDef[]; maxTokens: number },
  ): Promise<TeammateLlmResult>;
}

/**
 * Valores que o BRIEF não fixa (lacunas L-PR3-1, L-PR3-2 e L-PR3-5 do retorno): quem compõe o runner (worker do PR-4)
 * os informa; o runner não escolhe default.
 */
export type TeammateRunnerOptions = {
  /** Item 14: N das "últimas N mensagens da thread do canal". */
  memoryLimit: number;
  /** Item 15: prazo da `ActionProposal` (`expiresAt = agora + proposalTtlMs`). */
  proposalTtlMs: number;
  /** `maxTokens` de cada `complete` (§2.3). */
  maxTokens: number;
};

export type TeammateTurnOutcome =
  | { status: 'SKIPPED' }
  | { status: 'DONE'; answer: string | null; proposalId?: string; warning?: string }
  | { status: 'FAILED'; error: string };

type ToolClassOf = (name: string) => ActionClass | undefined;

const isRegistered = (tool: string): tool is keyof typeof TOOL_CLASS => Object.prototype.hasOwnProperty.call(TOOL_CLASS, tool);

/**
 * TeammateRunner — executa um turno de teammate (BE-INCR-TEAMMATES PR-3, itens 14–18).
 *
 * - Item 14: prompt = papel + playbook + relógio do usuário + grafo de conhecimento; ferramentas = `allowedTools` ∩
 *   registro (`TOOL_CLASS`); memória = últimas N mensagens da thread do canal, ou o prompt da rotina. MCP é do PR-10.
 * - Item 15: antes de cada ferramenta, a classe efetiva (registro + override): `LIVRE` executa; `PROPOSTA` grava
 *   `ActionProposal` (com `teammateId`, `expiresAt`) e encerra o turno; `PROIBIDA` ou fora da lista volta ao modelo
 *   como `agentToolError` e não executa.
 * - Item 16: mensagem de outro teammate e `AgentTurn.input` (corpo de webhook/mensagem) entram pelo `wrapUntrustedData`,
 *   em mensagem `user` — nunca `system`.
 * - Item 17 (D-4): as transações (pegar o turno, gravar o fim) abrem e fecham fora de toda chamada ao provedor.
 * - Item 18: grava provedor, modelo, tokens e no máximo `MAX_TOOL_ROUNDS` chamadas; estourou ⇒ `DONE` com aviso.
 */
export class TeammateRunner {
  constructor(
    private readonly turns: IAgentTurnRepository,
    private readonly context: ITurnContextRepository,
    private readonly teammates: Pick<ITeammateRepository, 'findLiveById'>,
    private readonly knowledgeGraph: { getGraphPrompt(userId: string): Promise<string> },
    private readonly tools: ITeammateToolHost,
    private readonly tables: ITeammateProposalTables,
    private readonly proposals: Pick<IActionProposalRepository, 'create'>,
    private readonly llm: ITeammateLlm,
    private readonly options: TeammateRunnerOptions,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async runTurn(turnId: string): Promise<TeammateTurnOutcome> {
    const turn = await this.turns.findById(turnId);
    if (!turn) throw new NotFoundError('Turno não encontrado.');
    const claimed = await this.turns.runTransaction((tx) => this.turns.claim(turnId, tx));
    if (!claimed) return { status: 'SKIPPED' };

    const usage: LlmUsage[] = [];
    let last: { provider: LlmProviderId; model: string } | null = null;
    const finish = (outcome: Exclude<TeammateTurnOutcome, { status: 'SKIPPED' }>): Promise<TeammateTurnOutcome> => {
      const sum = toTurnUsage(usage);
      const data: AgentTurnFinish = {
        status: outcome.status,
        provider: last?.provider ?? null,
        model: last?.model ?? null,
        promptTokens: usage.length ? sum.promptTokens : null,
        completionTokens: usage.length ? sum.completionTokens : null,
        error: outcome.status === 'FAILED' ? outcome.error : null,
        finishedAt: this.clock(),
      };
      return this.turns.runTransaction(async (tx: Prisma.TransactionClient) => {
        await this.turns.finish(turnId, data, tx);
        return outcome;
      });
    };

    try {
      const teammate = await this.teammates.findLiveById(turn.userId, turn.teammateId);
      if (!teammate) throw new TeammateTurnError('TURNO_SEM_TEAMMATE', 'Teammate do turno não encontrado.');
      const actor = await this.context.findActor(turn.userId);
      if (!actor) throw new TeammateTurnError('TURNO_SEM_USUARIO', `Teammate "${teammate.name}": dono do turno não encontrado.`);

      const messages = await this.buildMessages(turn, teammate, actor);
      const { defs, classOf } = await this.buildTools(teammate);

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const res = await this.llm.complete(turn.userId, teammate, {
          messages,
          ...(defs.length > 0 ? { tools: defs } : {}),
          maxTokens: this.options.maxTokens,
        });
        usage.push(res.usage);
        last = { provider: res.provider, model: res.model };

        const calls = res.message.toolCalls ?? [];
        if (calls.length === 0) return await finish({ status: 'DONE', answer: res.message.content });
        messages.push(res.message);

        for (const call of calls) {
          const cls = classOf(call.name);
          if (cls === 'LIVRE') {
            const result = await this.tools.handleToolCall(actor, call.name, call.arguments);
            messages.push(toolMessage(call, result));
          } else if (cls === 'PROPOSTA') {
            const proposed = await this.propose(turn, teammate, actor, call);
            if ('proposalId' in proposed) {
              return await finish({ status: 'DONE', answer: res.message.content, proposalId: proposed.proposalId });
            }
            messages.push(toolMessage(call, proposed));
          } else {
            messages.push(
              toolMessage(
                call,
                agentToolError('SEM_PERMISSAO', `O teammate "${teammate.name}" não tem permissão para usar a ferramenta "${call.name}".`),
              ),
            );
          }
        }
      }
      return await finish({ status: 'DONE', answer: null, warning: TURN_ROUND_LIMIT_WARNING });
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? `${(error as { code: unknown }).code}: ` : '';
      return finish({ status: 'FAILED', error: `${code}${error instanceof Error ? error.message : String(error)}` });
    }
  }

  /** Item 14 + item 16. */
  private async buildMessages(turn: IAgentTurn, teammate: ITeammate, actor: UserContext): Promise<LlmMessage[]> {
    const messages: LlmMessage[] = [
      { role: 'system', content: `Você é o teammate "${teammate.name}". Papel: ${teammate.role}.\n\nPlaybook:\n${teammate.playbook}` },
      { role: 'system', content: this.userClockPrompt(actor.timeZone) },
      { role: 'system', content: await this.knowledgeGraph.getGraphPrompt(turn.userId) },
    ];

    if (turn.trigger === 'MENTION') {
      if (!turn.channelMessageId) throw new TeammateTurnError('TURNO_SEM_MENSAGEM', `Teammate "${teammate.name}": turno de menção sem mensagem.`);
      const msg = await this.context.findChannelMessage(turn.userId, turn.channelMessageId);
      if (!msg) throw new TeammateTurnError('TURNO_SEM_MENSAGEM', `Teammate "${teammate.name}": mensagem do turno não encontrada.`);
      const thread = await this.context.listThread(msg.channelId, msg.threadId ?? msg.id, this.options.memoryLimit);
      for (const m of thread) messages.push(memoryMessage(m, teammate.id));
    } else {
      if (!turn.routineId) throw new TeammateTurnError('TURNO_SEM_ROTINA', `Teammate "${teammate.name}": turno ${turn.trigger} sem rotina.`);
      const prompt = await this.context.findRoutinePrompt(turn.userId, turn.routineId);
      if (prompt === null) throw new TeammateTurnError('TURNO_SEM_ROTINA', `Teammate "${teammate.name}": rotina do turno não encontrada.`);
      messages.push({ role: 'user', content: prompt });
    }

    if (turn.input !== null) {
      messages.push({ role: 'user', content: wrapUntrustedData(turn.trigger === 'WEBHOOK' ? 'corpo do webhook' : 'entrada do turno', turn.input) });
    }
    return messages;
  }

  /** Item 14: `allowedTools` ∩ registro, sem `PROIBIDA`. Entradas `mcp:` ficam para o cliente MCP (PR-10). */
  private async buildTools(teammate: ITeammate): Promise<{ defs: LlmToolDef[]; classOf: ToolClassOf }> {
    const allowed = new Set(teammate.allowedTools);
    const classOf: ToolClassOf = (name) => {
      if (!allowed.has(name) || !isRegistered(name)) return undefined;
      const base = TOOL_CLASS[name] as ActionClass; // o registro de hoje não tem PROIBIDA; a regra vale quando tiver
      if (base === 'PROIBIDA') return 'PROIBIDA';
      return teammate.toolOverrides?.[name] ?? base;
    };
    const defs: LlmToolDef[] = [];
    for (const t of await this.tools.getTools()) {
      if (t.type !== 'function') continue;
      const cls = classOf(t.function.name);
      if (cls === undefined || cls === 'PROIBIDA') continue;
      defs.push({
        name: t.function.name,
        description: t.function.description ?? '',
        parameters: (t.function.parameters ?? { type: 'object', properties: {} }) as Record<string, unknown>,
      });
    }
    return { defs, classOf };
  }

  /**
   * Item 15 — `PROPOSTA`: grava a `ActionProposal` do teammate. Para as ferramentas de linha, as mesmas recusas do
   * `LuminarisAgentService` antes de gravar (dados vazios, sem permissão, registro inexistente) voltam ao modelo.
   * Ferramenta `LIVRE` apertada para `PROPOSTA` por override não tem formato de proposta (lacuna L-PR3-6): o turno falha
   * sem executar.
   */
  private async propose(
    turn: IAgentTurn,
    teammate: ITeammate,
    actor: UserContext,
    call: LlmToolCall,
  ): Promise<{ proposalId: string } | AgentToolError> {
    const action = call.name === 'request_record_creation' ? 'CREATE' : call.name === 'request_record_update' ? 'UPDATE' : null;
    if (!action) {
      throw new TeammateTurnError(
        'PROPOSTA_SEM_FORMATO',
        `Teammate "${teammate.name}": a ferramenta "${call.name}" exige proposta, mas não tem formato de proposta.`,
      );
    }
    const args = call.arguments;
    const data = args.data as Record<string, unknown> | undefined;
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      return agentToolError('DADOS_VAZIOS', 'ERRO: Você deve fornecer o objeto "data" com os campos preenchidos. Não posso criar uma proposta vazia.');
    }
    const table = await this.tables.getTableById(actor, String(args.tableId));
    if (!this.tables.canManageData(actor, table)) {
      return agentToolError('SEM_PERMISSAO', `Você não tem permissão para alterar registros na tabela "${table.name}".`);
    }
    let rowData: Record<string, unknown> = data;
    if (action === 'UPDATE') {
      const recordId = String(args.recordId);
      const [record] = await this.tables.getTableDataByIds(actor, table.id, [recordId]);
      if (!record) return agentToolError('REGISTRO_NAO_ENCONTRADO', `O registro "${recordId}" não existe na tabela "${table.name}".`);
      rowData = { ...data, id: recordId };
    }
    const payload = ProposalPayloadSchema.parse({ kind: 'TABLE_ROW', action, tableId: table.id, data: rowData });
    const proposal = await this.proposals.create({
      userId: turn.userId,
      action,
      tableId: table.id,
      tableName: table.name,
      tableLabel: table.name,
      status: 'PENDING',
      data: rowData as Prisma.JsonValue,
      kind: 'TABLE_ROW',
      payload: payload as Prisma.JsonValue,
      teammateId: teammate.id,
      channelMessageId: turn.channelMessageId,
      expiresAt: new Date(this.clock().getTime() + this.options.proposalTtlMs),
    });
    return { proposalId: proposal.id };
  }

  /** Mesma regra do `userClockPrompt` do `ChatService` (fuso ausente ou desconhecido → UTC), com relógio injetado. */
  private userClockPrompt(timeZone: string | undefined): string {
    let zone = 'UTC';
    try {
      if (timeZone) {
        Intl.DateTimeFormat(undefined, { timeZone });
        zone = timeZone;
      }
    } catch {
      // RangeError: fuso desconhecido — fica UTC
    }
    const now = formatInTimeZone(this.clock(), zone, "yyyy-MM-dd'T'HH:mmxxx");
    return `Fuso horário do usuário: ${zone}. Agora no fuso do usuário: ${now}. Datas/horas que o usuário disser são nesse fuso: envie campos datetime em ISO 8601 com esse offset.`;
  }
}

function toolMessage(call: LlmToolCall, result: unknown): LlmMessage {
  return { role: 'tool', toolCallId: call.id, content: JSON.stringify(result) };
}

/** Item 16: o dono fala como `user`; o próprio teammate como `assistant`; outro teammate é dado não confiável. */
function memoryMessage(m: ITurnChannelMessage, selfId: string): LlmMessage {
  if (m.authorType === 'OWNER') return { role: 'user', content: m.content };
  if (m.authorId === selfId) return { role: 'assistant', content: m.content };
  return { role: 'user', content: wrapUntrustedData(`mensagem do teammate ${m.authorId}`, m.content) };
}
