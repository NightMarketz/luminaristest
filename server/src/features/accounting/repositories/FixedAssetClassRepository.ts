import prisma from '../../../lib/prisma';
import type { FixedAssetClass, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type {
  CreateFixedAssetClassData,
  IFixedAssetClassRepository,
  UpdateFixedAssetClassData,
} from './IFixedAssetClassRepository';

export class FixedAssetClassRepository implements IFixedAssetClassRepository {
  public async create(
    data: CreateFixedAssetClassData,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAssetClass> {
    return (tx ?? prisma).fixedAssetClass.create({ data });
  }

  public async findById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAssetClass | null> {
    return (tx ?? prisma).fixedAssetClass.findFirst({
      where: { id, ...accountingScopeWhere(scope), deletedAt: null },
    });
  }

  public async findManyByUnit(
    scope: AccountingScope,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAssetClass[]> {
    return (tx ?? prisma).fixedAssetClass.findMany({
      where: { ...accountingScopeWhere(scope), deletedAt: null },
      orderBy: [{ code: 'asc' }],
    });
  }

  public async update(
    scope: AccountingScope,
    id: string,
    data: UpdateFixedAssetClassData,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAssetClass> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).fixedAssetClass.update({ where: { id, userId, unitId }, data });
  }

  public async softDelete(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<FixedAssetClass> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).fixedAssetClass.update({
      where: { id, userId, unitId },
      data: { deletedAt: new Date() },
    });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
