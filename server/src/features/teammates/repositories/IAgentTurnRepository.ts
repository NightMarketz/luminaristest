import type { Prisma } from 'generated/prisma';
import type { UserContext } from '../../../lib/authUtils';
import type { AgentTurnFinish, IAgentTurn, ITurnChannelMessage } from '../models/AgentTurn.model';

/** Acesso a `agent_turns` (BE-INCR-TEAMMATES PR-3, itens 14–18). Zero regra de negócio. */
export interface IAgentTurnRepository {
  findById(id: string): Promise<IAgentTurn | null>;
  /** `PENDING → RUNNING` (+1 tentativa) só se ainda estiver `PENDING`; `false` = outro já pegou. */
  claim(id: string, tx: Prisma.TransactionClient): Promise<boolean>;
  finish(id: string, data: AgentTurnFinish, tx: Prisma.TransactionClient): Promise<void>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

/** Leituras de contexto do turno (item 14): dono, rotina e thread do canal. Só leitura, escopo pelo `userId`. */
export interface ITurnContextRepository {
  findActor(userId: string): Promise<UserContext | null>;
  findRoutinePrompt(userId: string, routineId: string): Promise<string | null>;
  findChannelMessage(userId: string, messageId: string): Promise<ITurnChannelMessage | null>;
  /** As últimas `limit` mensagens da thread (raiz + respostas), em ordem cronológica. */
  listThread(channelId: string, rootId: string, limit: number): Promise<ITurnChannelMessage[]>;
}
