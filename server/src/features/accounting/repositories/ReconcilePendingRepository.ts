import prisma from '../../../lib/prisma';
import type { Prisma, ReconcilePendingItem } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type {
  IReconcilePendingRepository,
  ReconcilePendingCapture,
} from './IReconcilePendingRepository';

/**
 * Prisma-backed repository for `reconcile_pending_items`. Only place with
 * `prisma.reconcilePendingItem.*` access. No soft-delete column — `resolvedAt` plays that role
 * (`null` = pending), so every read that means "still pending" filters `resolvedAt: null`
 * explicitly rather than the universal `deletedAt: null` convention.
 */
export class ReconcilePendingRepository implements IReconcilePendingRepository {
  public async upsertPending(
    scope: AccountingScope,
    item: ReconcilePendingCapture,
    tx?: Prisma.TransactionClient,
  ): Promise<ReconcilePendingItem> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).reconcilePendingItem.upsert({
      where: {
        userId_unitId_sourceType_sourceId: {
          userId,
          unitId,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
        },
      },
      create: {
        userId,
        unitId,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        reasonCode: item.reasonCode,
        reasonDetail: item.reasonDetail,
        attempts: 1,
        resolvedAt: null,
      },
      // Reopens unconditionally (resolvedAt: null even when already null — a no-op in that case,
      // a REOPEN when the row had been resolved): the same identity failing/blocking again always
      // means "still pending", regardless of what happened in between.
      update: {
        reasonCode: item.reasonCode,
        reasonDetail: item.reasonDetail,
        resolvedAt: null,
        attempts: { increment: 1 },
      },
    });
  }

  public async resolvePending(
    scope: AccountingScope,
    sourceType: string,
    sourceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await (tx ?? prisma).reconcilePendingItem.updateMany({
      where: { ...accountingScopeWhere(scope), sourceType, sourceId, resolvedAt: null },
      data: { resolvedAt: new Date() },
    });
    return result.count;
  }

  public async bumpAttempts(
    scope: AccountingScope,
    sourceType: string,
    sourceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await (tx ?? prisma).reconcilePendingItem.updateMany({
      where: { ...accountingScopeWhere(scope), sourceType, sourceId, resolvedAt: null },
      data: { attempts: { increment: 1 } },
    });
    return result.count;
  }

  public async findById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ReconcilePendingItem | null> {
    return (tx ?? prisma).reconcilePendingItem.findFirst({
      where: { id, ...accountingScopeWhere(scope) },
    });
  }

  public async findManyByUnit(
    scope: AccountingScope,
    params: { reasonCode?: string; includeResolved: boolean; cursor?: string; limit: number },
  ): Promise<{ items: ReconcilePendingItem[]; hasMore: boolean }> {
    const where: Prisma.ReconcilePendingItemWhereInput = {
      ...accountingScopeWhere(scope),
      ...(params.reasonCode ? { reasonCode: params.reasonCode } : {}),
      ...(params.includeResolved ? {} : { resolvedAt: null }),
      ...(params.cursor ? { id: { gt: params.cursor } } : {}),
    };
    // Fetch one extra row to detect "more pages" without a second COUNT query.
    const rows = await prisma.reconcilePendingItem.findMany({
      where,
      orderBy: { id: 'asc' },
      take: params.limit + 1,
    });
    const hasMore = rows.length > params.limit;
    return { items: hasMore ? rows.slice(0, params.limit) : rows, hasMore };
  }

  public async findUnresolved(
    scope: AccountingScope,
    ids?: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<ReconcilePendingItem[]> {
    return (tx ?? prisma).reconcilePendingItem.findMany({
      where: {
        ...accountingScopeWhere(scope),
        resolvedAt: null,
        ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
      },
      orderBy: { id: 'asc' },
    });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
