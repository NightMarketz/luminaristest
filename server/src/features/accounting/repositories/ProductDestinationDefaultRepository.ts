import prisma from '../../../lib/prisma';
import type { Prisma, ProductDestinationDefault } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { ProductDestinationDefaultValue } from '../models/itemDestination';
import type { IProductDestinationDefaultRepository } from './IProductDestinationDefaultRepository';

/** Prisma-backed `product_destination_defaults` (BRIEF item 16). */
export class ProductDestinationDefaultRepository implements IProductDestinationDefaultRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async findManyByProductRefs(scope: AccountingScope, productRefs: string[], tx?: Prisma.TransactionClient): Promise<ProductDestinationDefault[]> {
    if (productRefs.length === 0) return [];
    return this.db(tx).productDestinationDefault.findMany({ where: { ...accountingScopeWhere(scope), productRef: { in: productRefs }, deletedAt: null } });
  }

  public async findByProductRef(scope: AccountingScope, productRef: string, tx?: Prisma.TransactionClient): Promise<ProductDestinationDefault | null> {
    return this.db(tx).productDestinationDefault.findFirst({ where: { ...accountingScopeWhere(scope), productRef, deletedAt: null } });
  }

  public async list(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<ProductDestinationDefault[]> {
    return this.db(tx).productDestinationDefault.findMany({ where: { ...accountingScopeWhere(scope), deletedAt: null }, orderBy: { productRef: 'asc' } });
  }

  public async upsert(scope: AccountingScope, productRef: string, destination: ProductDestinationDefaultValue, tx?: Prisma.TransactionClient): Promise<ProductDestinationDefault> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return this.db(tx).productDestinationDefault.upsert({
      where: { userId_unitId_productRef: { userId, unitId, productRef } },
      create: { userId, unitId, productRef, destination },
      update: { destination, deletedAt: null },
    });
  }

  public async softDelete(scope: AccountingScope, productRef: string, tx?: Prisma.TransactionClient): Promise<number> {
    const { count } = await this.db(tx).productDestinationDefault.updateMany({
      where: { ...accountingScopeWhere(scope), productRef, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return count;
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
