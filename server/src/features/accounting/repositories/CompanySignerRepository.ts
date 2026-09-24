import prisma from '../../../lib/prisma';
import type { CompanySigner, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { CompanySignerData, ICompanySignerRepository } from './ICompanySignerRepository';

/** Prisma-backed `company_signers` (X13). Soft-delete; linha viva = `deletedAt: null`. */
export class CompanySignerRepository implements ICompanySignerRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async list(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<CompanySigner[]> {
    return this.db(tx).companySigner.findMany({ where: { userId: scope.ownerUserId, deletedAt: null }, orderBy: { nome: 'asc' } });
  }

  public async findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<CompanySigner | null> {
    return this.db(tx).companySigner.findFirst({ where: { id, userId: scope.ownerUserId, deletedAt: null } });
  }

  public async create(scope: AccountingScope, data: CompanySignerData, tx?: Prisma.TransactionClient): Promise<CompanySigner> {
    return this.db(tx).companySigner.create({ data: { userId: scope.ownerUserId, createdById: scope.actorUserId, ...data } });
  }

  public async update(_scope: AccountingScope, id: string, data: CompanySignerData, tx?: Prisma.TransactionClient): Promise<CompanySigner> {
    return this.db(tx).companySigner.update({ where: { id }, data });
  }

  public async softDelete(_scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<CompanySigner> {
    return this.db(tx).companySigner.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  public async countLiveProfileRefs(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<number> {
    return this.db(tx).companyFiscalProfile.count({ where: { userId: scope.ownerUserId, representanteLegalSignerId: id, deletedAt: null } });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
