import prisma from '../../../lib/prisma';
import type { Prisma, ServiceFiscalProfile } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { IServiceFiscalProfileRepository, ServiceFiscalProfileData } from './IServiceFiscalProfileRepository';

export const deletedServiceRef = (id: string, serviceRef: string) => `deleted:${id}:${serviceRef}`;

/** Prisma-backed `service_fiscal_profiles` (BRIEF item 2). */
export class ServiceFiscalProfileRepository implements IServiceFiscalProfileRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async findByServiceRef(scope: AccountingScope, serviceRef: string, tx?: Prisma.TransactionClient): Promise<ServiceFiscalProfile | null> {
    return this.db(tx).serviceFiscalProfile.findFirst({ where: { ...accountingScopeWhere(scope), serviceRef, deletedAt: null } });
  }

  public async findManyByServiceRefs(scope: AccountingScope, serviceRefs: string[], tx?: Prisma.TransactionClient): Promise<ServiceFiscalProfile[]> {
    if (serviceRefs.length === 0) return [];
    return this.db(tx).serviceFiscalProfile.findMany({ where: { ...accountingScopeWhere(scope), serviceRef: { in: serviceRefs }, deletedAt: null } });
  }

  public async listByScope(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<ServiceFiscalProfile[]> {
    return this.db(tx).serviceFiscalProfile.findMany({ where: { ...accountingScopeWhere(scope), deletedAt: null }, orderBy: { serviceRef: 'asc' } });
  }

  public async upsert(scope: AccountingScope, serviceRef: string, data: ServiceFiscalProfileData, tx?: Prisma.TransactionClient): Promise<ServiceFiscalProfile> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return this.db(tx).serviceFiscalProfile.upsert({
      where: { userId_unitId_serviceRef: { userId, unitId, serviceRef } },
      create: { userId, unitId, serviceRef, createdById: scope.actorUserId, updatedById: scope.actorUserId, ...data },
      update: { updatedById: scope.actorUserId, ...data },
    });
  }

  /** rename-on-delete: a linha apagada deixa de ocupar a chave (re-criar não dá P2002). */
  public async softDelete(scope: AccountingScope, serviceRef: string, tx?: Prisma.TransactionClient): Promise<number> {
    const row = await this.findByServiceRef(scope, serviceRef, tx);
    if (!row) return 0;
    await this.db(tx).serviceFiscalProfile.update({
      where: { id: row.id },
      data: { deletedAt: new Date(), updatedById: scope.actorUserId, serviceRef: deletedServiceRef(row.id, serviceRef) },
    });
    return 1;
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
