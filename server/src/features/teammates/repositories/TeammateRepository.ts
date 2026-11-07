import prisma from '../../../lib/prisma';
import { Prisma, type Teammate } from 'generated/prisma';
import { NotFoundError } from '../../../lib/errors';
import type { LlmProviderId } from '../../../lib/llm/LlmProvider';
import type { ITeammate, TeammateWrite } from '../models/Teammate.model';
import type { ITeammateRepository } from './ITeammateRepository';

/** Repositório Prisma de `teammates` (BE-INCR-TEAMMATES PR-2, item 10). Zero regra de negócio. */
export class TeammateRepository implements ITeammateRepository {
  public async create(userId: string, data: TeammateWrite, tx: Prisma.TransactionClient): Promise<ITeammate> {
    const { toolOverrides, ...rest } = data;
    const row = await tx.teammate.create({ data: { userId, ...rest, toolOverrides: jsonOrDbNull(toolOverrides) } });
    return toDomain(row);
  }

  public async listLive(userId: string): Promise<ITeammate[]> {
    const rows = await prisma.teammate.findMany({ where: { userId, deletedAt: null }, orderBy: [{ createdAt: 'asc' }] });
    return rows.map(toDomain);
  }

  public async findLiveById(userId: string, id: string, tx?: Prisma.TransactionClient): Promise<ITeammate | null> {
    const row = await (tx ?? prisma).teammate.findFirst({ where: { id, userId, deletedAt: null } });
    return row ? toDomain(row) : null;
  }

  public async update(userId: string, id: string, data: Partial<TeammateWrite>, tx: Prisma.TransactionClient): Promise<ITeammate> {
    const { toolOverrides, ...rest } = data;
    const patch: Prisma.TeammateUpdateManyMutationInput = { ...rest };
    if (toolOverrides !== undefined) patch.toolOverrides = jsonOrDbNull(toolOverrides);
    const { count } = await tx.teammate.updateMany({ where: { id, userId, deletedAt: null }, data: patch });
    if (count === 0) throw new NotFoundError('Teammate não encontrado.');
    return toDomain(await tx.teammate.findUniqueOrThrow({ where: { id } }));
  }

  public async softDelete(userId: string, id: string): Promise<void> {
    const { count } = await prisma.teammate.updateMany({ where: { id, userId, deletedAt: null }, data: { deletedAt: new Date() } });
    if (count === 0) throw new NotFoundError('Teammate não encontrado.');
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}

/** `null` grava NULL do SQL (DbNull), igual ao default da coluna. */
function jsonOrDbNull(v: Record<string, string> | null): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return v === null ? Prisma.DbNull : v;
}

function toDomain(row: Teammate): ITeammate {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    role: row.role,
    playbook: row.playbook,
    allowedTools: row.allowedTools as string[],
    toolOverrides: (row.toolOverrides as Record<string, 'PROPOSTA'> | null) ?? null,
    provider: row.provider as LlmProviderId,
    model: row.model,
    fallbackProvider: (row.fallbackProvider as LlmProviderId | null) ?? null,
    fallbackModel: row.fallbackModel,
    dailyTurnLimit: row.dailyTurnLimit,
    status: row.status as 'ACTIVE' | 'PAUSED',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
