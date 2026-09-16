import prisma from '../../../lib/prisma';
import type { FiscalProfile, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { FiscalProfileData, IFiscalProfileRepository } from './IFiscalProfileRepository';

/** Prisma-backed `fiscal_profiles` (X6). Soft-delete por `deletedAt`; o upsert REVIVE uma linha apagada (mesma @@unique). */
export class FiscalProfileRepository implements IFiscalProfileRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async findByScope(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<FiscalProfile | null> {
    return this.db(tx).fiscalProfile.findFirst({ where: { ...accountingScopeWhere(scope), deletedAt: null } });
  }

  public async upsert(scope: AccountingScope, data: FiscalProfileData, tx?: Prisma.TransactionClient): Promise<FiscalProfile> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return this.db(tx).fiscalProfile.upsert({
      where: { userId_unitId: { userId, unitId } },
      create: { userId, unitId, createdById: scope.actorUserId, updatedById: scope.actorUserId, ...data },
      update: { updatedById: scope.actorUserId, deletedAt: null, ...data },
    });
  }

  public async softDelete(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<number> {
    const r = await this.db(tx).fiscalProfile.updateMany({
      where: { ...accountingScopeWhere(scope), deletedAt: null },
      data: { deletedAt: new Date(), updatedById: scope.actorUserId },
    });
    return r.count;
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
