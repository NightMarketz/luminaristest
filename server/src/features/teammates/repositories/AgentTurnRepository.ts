import prisma from '../../../lib/prisma';
import type { AgentChannelMessage, AgentTurn, Prisma } from 'generated/prisma';
import type { UserContext } from '../../../lib/authUtils';
import type { Role } from '../../users/models/User.model';
import type { AgentTurnFinish, IAgentTurn, ITurnChannelMessage } from '../models/AgentTurn.model';
import type { IAgentTurnRepository, ITurnContextRepository } from './IAgentTurnRepository';

/** Repositório Prisma de `agent_turns` (BE-INCR-TEAMMATES PR-3). Zero regra de negócio. */
export class AgentTurnRepository implements IAgentTurnRepository {
  public async findById(id: string): Promise<IAgentTurn | null> {
    const row = await prisma.agentTurn.findUnique({ where: { id } });
    return row ? toTurn(row) : null;
  }

  public async claim(id: string, tx: Prisma.TransactionClient): Promise<boolean> {
    const { count } = await tx.agentTurn.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'RUNNING', attempts: { increment: 1 } },
    });
    return count === 1;
  }

  public async finish(id: string, data: AgentTurnFinish, tx: Prisma.TransactionClient): Promise<void> {
    await tx.agentTurn.update({ where: { id }, data });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}

/** Leituras de contexto do turno (item 14). Rotina e canal só vivos (`deletedAt: null`) e do dono. */
export class TurnContextRepository implements ITurnContextRepository {
  public async findActor(userId: string): Promise<UserContext | null> {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
    if (!u) return null;
    const role = u.role as Role;
    return {
      id: u.id,
      userId: u.id,
      name: u.name ?? '',
      username: u.username,
      email: u.email,
      role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      userRole: role,
      userEmail: u.email,
      userName: u.name ?? undefined,
    };
  }

  public async findRoutinePrompt(userId: string, routineId: string): Promise<string | null> {
    const r = await prisma.teammateRoutine.findFirst({ where: { id: routineId, userId, deletedAt: null }, select: { prompt: true } });
    return r?.prompt ?? null;
  }

  public async findChannelMessage(userId: string, messageId: string): Promise<ITurnChannelMessage | null> {
    const m = await prisma.agentChannelMessage.findUnique({ where: { id: messageId } });
    if (!m) return null;
    const channel = await prisma.agentChannel.findFirst({ where: { id: m.channelId, userId, deletedAt: null }, select: { id: true } });
    return channel ? toMessage(m) : null;
  }

  public async listThread(channelId: string, rootId: string, limit: number): Promise<ITurnChannelMessage[]> {
    const rows = await prisma.agentChannelMessage.findMany({
      where: { channelId, OR: [{ id: rootId }, { threadId: rootId }] },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    return rows.reverse().map(toMessage);
  }
}

function toTurn(row: AgentTurn): IAgentTurn {
  return {
    id: row.id,
    userId: row.userId,
    teammateId: row.teammateId,
    trigger: row.trigger as IAgentTurn['trigger'],
    routineId: row.routineId,
    channelMessageId: row.channelMessageId,
    input: row.input,
    hop: row.hop,
    status: row.status as IAgentTurn['status'],
    attempts: row.attempts,
  };
}

function toMessage(m: AgentChannelMessage): ITurnChannelMessage {
  return {
    id: m.id,
    channelId: m.channelId,
    threadId: m.threadId,
    authorType: m.authorType as ITurnChannelMessage['authorType'],
    authorId: m.authorId,
    content: m.content,
    createdAt: m.createdAt,
  };
}
