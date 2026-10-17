import prisma from '../../../lib/prisma';
import type { Prisma, SimplesCreditoIncobravel } from 'generated/prisma';
import { accountingScopeWhere, type AccountingScope } from '../scope/AccountingScope';
import type { ISimplesCreditoIncobravelRepository, SimplesCreditoIncobravelData } from './ISimplesCreditoIncobravelRepository';

/** Repositório Prisma dos créditos incobráveis do Simples (X14-CAIXA PR-3). Zero regra de negócio. */
export class SimplesCreditoIncobravelRepository implements ISimplesCreditoIncobravelRepository {
  public async create(scope: AccountingScope, data: SimplesCreditoIncobravelData, tx: Prisma.TransactionClient): Promise<SimplesCreditoIncobravel> {
    return tx.simplesCreditoIncobravel.create({ data: { ...accountingScopeWhere(scope), ...data, createdById: scope.actorUserId } });
  }

  public async findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<SimplesCreditoIncobravel | null> {
    return (tx ?? prisma).simplesCreditoIncobravel.findFirst({ where: { ...accountingScopeWhere(scope), id, deletedAt: null } });
  }

  public async softDelete(scope: AccountingScope, id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.simplesCreditoIncobravel.updateMany({ where: { ...accountingScopeWhere(scope), id, deletedAt: null }, data: { deletedAt: new Date() } });
  }

  public async somaAtivaPorVenda(scope: AccountingScope, saleIds: readonly string[], tx?: Prisma.TransactionClient): Promise<Map<string, bigint>> {
    if (saleIds.length === 0) return new Map();
    const g = await (tx ?? prisma).simplesCreditoIncobravel.groupBy({
      by: ['saleId'],
      where: { ...accountingScopeWhere(scope), saleId: { in: [...saleIds] }, deletedAt: null },
      _sum: { valorCents: true },
    });
    return new Map(g.map((r) => [r.saleId, r._sum.valorCents ?? 0n]));
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
