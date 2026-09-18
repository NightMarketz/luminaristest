import prisma from '../../../lib/prisma';
import type { DepreciationRate, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type {
  CreateDepreciationRateData,
  IDepreciationRateRepository,
} from './IDepreciationRateRepository';

/** Repositório Prisma da tabela de taxas. Wrapper fino: zero regra de negócio. */
export class DepreciationRateRepository implements IDepreciationRateRepository {
  public async create(
    data: CreateDepreciationRateData,
    tx?: Prisma.TransactionClient,
  ): Promise<DepreciationRate> {
    return (tx ?? prisma).depreciationRate.create({ data });
  }

  public async createMany(
    data: CreateDepreciationRateData[],
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await (tx ?? prisma).depreciationRate.createMany({ data });
    return result.count;
  }

  public async findById(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<DepreciationRate | null> {
    return (tx ?? prisma).depreciationRate.findFirst({ where: { id, ...accountingScopeWhere(scope) } });
  }

  public async findManyByUnit(
    scope: AccountingScope,
    includeHidden: boolean,
    tx?: Prisma.TransactionClient,
  ): Promise<DepreciationRate[]> {
    return (tx ?? prisma).depreciationRate.findMany({
      where: { ...accountingScopeWhere(scope), ...(includeHidden ? {} : { hiddenAt: null }) },
      orderBy: [{ source: 'asc' }, { sourceRow: 'asc' }],
    });
  }

  public async hasAnexoSeed(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<boolean> {
    const count = await (tx ?? prisma).depreciationRate.count({
      where: { ...accountingScopeWhere(scope), source: { not: 'CUSTOM' } },
    });
    return count > 0;
  }

  public async hide(
    scope: AccountingScope,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<DepreciationRate> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).depreciationRate.update({
      where: { id, userId, unitId },
      data: { hiddenAt: new Date() },
    });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
