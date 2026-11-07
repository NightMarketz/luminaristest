/**
 * Turno de teammate (BE-INCR-TEAMMATES PR-3, itens 14–18; BRIEF §1 e §2.1 `AgentTurn`). O tipo da linha vem de
 * `generated/prisma`; este arquivo é dono do domínio do turno e dos códigos de falha do runner.
 */
import type { LlmProviderId } from '../../../lib/llm/LlmProvider';

export type AgentTurnTrigger = 'ROUTINE' | 'MANUAL' | 'MENTION' | 'WEBHOOK';
export type AgentTurnStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'PAUSED';

export interface IAgentTurn {
  id: string;
  userId: string;
  teammateId: string;
  trigger: AgentTurnTrigger;
  routineId: string | null;
  channelMessageId: string | null;
  /** Corpo do webhook / mensagem — dado não confiável (§2.1; item 16). */
  input: string | null;
  hop: number;
  status: AgentTurnStatus;
  attempts: number;
}

/** O que o fim do turno grava (item 18). Duração: lacuna L-PR3-3 do retorno (sem coluna no §2.1). */
export type AgentTurnFinish = {
  status: Extract<AgentTurnStatus, 'DONE' | 'FAILED'>;
  provider: LlmProviderId | null;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  error: string | null;
  finishedAt: Date;
};

/** Item 18: o mesmo teto de voltas do laço do chat (`ChatService`, `while (iterations < 5)`). */
export const MAX_TOOL_ROUNDS = 5;
export const TURN_ROUND_LIMIT_WARNING = `O limite de ${MAX_TOOL_ROUNDS} voltas de ferramenta do turno foi atingido.`;

/** Mensagem de canal lida para a memória do turno (item 14). */
export interface ITurnChannelMessage {
  id: string;
  channelId: string;
  threadId: string | null;
  authorType: 'OWNER' | 'TEAMMATE';
  authorId: string;
  content: string;
  createdAt: Date;
}

/** Falha do turno que não é do provedor: vai a `FAILED` com o código no `error`. */
export class TeammateTurnError extends Error {
  constructor(
    readonly code: 'TURNO_SEM_TEAMMATE' | 'TURNO_SEM_USUARIO' | 'TURNO_SEM_ROTINA' | 'TURNO_SEM_MENSAGEM' | 'PROPOSTA_SEM_FORMATO',
    message: string,
  ) {
    super(message);
    this.name = 'TeammateTurnError';
  }
}
