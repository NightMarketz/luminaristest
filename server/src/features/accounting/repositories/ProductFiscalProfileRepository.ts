import prisma from '../../../lib/prisma';
import type { Prisma, ProductFiscalProfile } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IProductFiscalProfileRepository, ProductFiscalProfileData } from './IProductFiscalProfileRepository';

export const deletedProductRef = (id: string, productRef: string) => `deleted:${id}:${productRef}`;

/** Prisma-backed `product_fiscal_profiles` (BE-INCR-NFCE item 10) — escopo = dono (sem unitId, F-NFCE-3 b). */
export class ProductFiscalProfileRepository implements IProductFiscalProfileRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async findByProductRef(scope: AccountingScope, productRef: string, tx?: Prisma.TransactionClient): Promise<ProductFiscalProfile | null> {
    return this.db(tx).productFiscalProfile.findFirst({ where: { userId: scope.ownerUserId, productRef, deletedAt: null } });
  }

  public async findManyByProductRefs(scope: AccountingScope, productRefs: string[], tx?: Prisma.TransactionClient): Promise<ProductFiscalProfile[]> {
    if (productRefs.length === 0) return [];
    return this.db(tx).productFiscalProfile.findMany({ where: { userId: scope.ownerUserId, productRef: { in: productRefs }, deletedAt: null } });
  }

  public async listByOwner(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<ProductFiscalProfile[]> {
    return this.db(tx).productFiscalProfile.findMany({ where: { userId: scope.ownerUserId, deletedAt: null }, orderBy: { productRef: 'asc' } });
  }

  public async upsert(scope: AccountingScope, productRef: string, data: ProductFiscalProfileData, tx?: Prisma.TransactionClient): Promise<ProductFiscalProfile> {
    const userId = scope.ownerUserId;
    return this.db(tx).productFiscalProfile.upsert({
      where: { userId_productRef: { userId, productRef } },
      create: { userId, productRef, createdById: scope.actorUserId, updatedById: scope.actorUserId, ...data },
      update: { updatedById: scope.actorUserId, ...data },
    });
  }

  /** rename-on-delete: a linha apagada deixa de ocupar a chave (re-criar não dá P2002). */
  public async softDelete(scope: AccountingScope, productRef: string, tx?: Prisma.TransactionClient): Promise<number> {
    const row = await this.findByProductRef(scope, productRef, tx);
    if (!row) return 0;
    await this.db(tx).productFiscalProfile.update({
      where: { id: row.id },
      data: { deletedAt: new Date(), updatedById: scope.actorUserId, productRef: deletedProductRef(row.id, productRef) },
    });
    return 1;
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
