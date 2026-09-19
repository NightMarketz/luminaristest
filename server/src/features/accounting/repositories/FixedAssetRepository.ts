import prisma from '../../../lib/prisma';
import type { FixedAsset, Prisma } from 'generated/prisma';
import type { FixedAssetStatus } from '../models/FixedAsset.model';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type {
  CreateFixedAssetData,
  IFixedAssetRepository,
  UpdateFixedAssetData,
} from './IFixedAssetRepository';

export class FixedAssetRepository implements IFixedAssetRepository {
  public async create(data: CreateFixedAssetData, tx?: Prisma.TransactionClient): Promise<FixedAsset> {
    return (tx ?? prisma).fixedAsset.create({ data });
  }

  public async findById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset | null> {
    return (tx ?? prisma).fixedAsset.findFirst({
      where: { id, ...accountingScopeWhere(scope), deletedAt: null },
    });
  }

  public async findByCode(
    scope: AccountingScope,
    code: string,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset | null> {
    return (tx ?? prisma).fixedAsset.findFirst({
      where: { code, ...accountingScopeWhere(scope), deletedAt: null },
    });
  }

  public async findManyByUnit(
    scope: AccountingScope,
    filter: { status?: string; classId?: string },
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset[]> {
    return (tx ?? prisma).fixedAsset.findMany({
      where: {
        ...accountingScopeWhere(scope),
        deletedAt: null,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.classId ? { classId: filter.classId } : {}),
      },
      orderBy: [{ code: 'asc' }],
    });
  }

  public async findActiveDepreciable(
    scope: AccountingScope,
    asOfDate: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset[]> {
    return (tx ?? prisma).fixedAsset.findMany({
      where: {
        ...accountingScopeWhere(scope),
        deletedAt: null,
        status: 'ACTIVE',
        activatedAt: { lte: asOfDate },
        class: { depreciable: true },
      },
      orderBy: [{ code: 'asc' }],
    });
  }

  public async countByClass(
    scope: AccountingScope,
    classId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    return (tx ?? prisma).fixedAsset.count({
      where: { classId, ...accountingScopeWhere(scope), deletedAt: null },
    });
  }

  public async update(
    scope: AccountingScope,
    id: string,
    data: UpdateFixedAssetData,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).fixedAsset.update({ where: { id, userId, unitId }, data });
  }

  public async softDelete(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).fixedAsset.update({ where: { id, userId, unitId }, data: { deletedAt: new Date() } });
  }

  public async activate(
    scope: AccountingScope,
    id: string,
    data: { activatedAt: Date; openingAccumulatedCents: bigint },
    expectedVersion: number,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset | null> {
    const client = tx ?? prisma;
    const { userId, unitId } = accountingScopeWhere(scope);
    const result = await client.fixedAsset.updateMany({
      where: { id, userId, unitId, version: expectedVersion },
      data: {
        status: 'ACTIVE',
        activatedAt: data.activatedAt,
        openingAccumulatedCents: data.openingAccumulatedCents,
        accumulatedDepreciationCents: data.openingAccumulatedCents,
        version: { increment: 1 },
      },
    });
    if (result.count === 0) return null;
    return client.fixedAsset.findFirst({ where: { id, userId, unitId } });
  }

  public async dispose(
    scope: AccountingScope,
    id: string,
    data: { disposedAt: Date; disposalEntryId: string },
    expectedVersion: number,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset | null> {
    const client = tx ?? prisma;
    const { userId, unitId } = accountingScopeWhere(scope);
    const result = await client.fixedAsset.updateMany({
      where: { id, userId, unitId, version: expectedVersion },
      data: {
        status: 'DISPOSED',
        disposedAt: data.disposedAt,
        disposalEntryId: data.disposalEntryId,
        version: { increment: 1 },
      },
    });
    if (result.count === 0) return null;
    return client.fixedAsset.findFirst({ where: { id, userId, unitId } });
  }

  public async addAccumulated(
    scope: AccountingScope,
    id: string,
    deltaCents: bigint,
    expected: { accumulatedDepreciationCents: bigint; version: number },
    nextStatus: FixedAssetStatus | undefined,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAsset | null> {
    const client = tx ?? prisma;
    const { userId, unitId } = accountingScopeWhere(scope);
    const result = await client.fixedAsset.updateMany({
      where: {
        id,
        userId,
        unitId,
        version: expected.version,
        accumulatedDepreciationCents: expected.accumulatedDepreciationCents,
      },
      data: {
        accumulatedDepreciationCents: { increment: deltaCents },
        version: { increment: 1 },
        ...(nextStatus !== undefined ? { status: nextStatus } : {}),
      },
    });
    if (result.count === 0) return null;
    return client.fixedAsset.findFirst({ where: { id, userId, unitId } });
  }

  public async reconcileAccumulated(
    scope: AccountingScope,
    id: string,
    accumulatedDepreciationCents: bigint,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const { userId, unitId } = accountingScopeWhere(scope);
    await (tx ?? prisma).fixedAsset.updateMany({
      where: { id, userId, unitId },
      data: { accumulatedDepreciationCents },
    });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
