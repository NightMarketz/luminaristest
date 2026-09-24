import prisma from '../../../lib/prisma';
import type { CompanyFiscalProfile, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { CompanyFiscalProfileData, ICompanyFiscalProfileRepository } from './ICompanyFiscalProfileRepository';

/** Prisma-backed `company_fiscal_profiles` (X13). Soft-delete; o upsert REVIVE a linha apagada (mesma @@unique). */
export class CompanyFiscalProfileRepository implements ICompanyFiscalProfileRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async findByYear(scope: AccountingScope, ano: number, tx?: Prisma.TransactionClient): Promise<CompanyFiscalProfile | null> {
    return this.db(tx).companyFiscalProfile.findFirst({ where: { userId: scope.ownerUserId, anoCalendario: ano, deletedAt: null } });
  }

  public async upsert(scope: AccountingScope, ano: number, data: CompanyFiscalProfileData, tx?: Prisma.TransactionClient): Promise<CompanyFiscalProfile> {
    const userId = scope.ownerUserId;
    return this.db(tx).companyFiscalProfile.upsert({
      where: { userId_anoCalendario: { userId, anoCalendario: ano } },
      create: { userId, anoCalendario: ano, createdById: scope.actorUserId, updatedById: scope.actorUserId, ...data },
      update: { updatedById: scope.actorUserId, deletedAt: null, ...data },
    });
  }

  public async softDelete(scope: AccountingScope, ano: number, tx?: Prisma.TransactionClient): Promise<number> {
    const r = await this.db(tx).companyFiscalProfile.updateMany({
      where: { userId: scope.ownerUserId, anoCalendario: ano, deletedAt: null },
      data: { deletedAt: new Date(), updatedById: scope.actorUserId },
    });
    return r.count;
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
