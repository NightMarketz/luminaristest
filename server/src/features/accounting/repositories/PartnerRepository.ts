import prisma from '../../../lib/prisma';
import type { Partner, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IPartnerRepository, PartnerData } from './IPartnerRepository';

/** Prisma-backed `partners` (IRRF-DISTRIBUICAO PR-1). Soft-delete; linha viva = `deletedAt: null`. */
export class PartnerRepository implements IPartnerRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async list(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<Partner[]> {
    return this.db(tx).partner.findMany({ where: { userId: scope.ownerUserId, deletedAt: null }, orderBy: [{ nome: 'asc' }, { entradaEm: 'asc' }] });
  }

  public async findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<Partner | null> {
    return this.db(tx).partner.findFirst({ where: { id, userId: scope.ownerUserId, deletedAt: null } });
  }

  public async listByTaxId(scope: AccountingScope, taxId: string, tx?: Prisma.TransactionClient): Promise<Partner[]> {
    return this.db(tx).partner.findMany({ where: { userId: scope.ownerUserId, taxId, deletedAt: null } });
  }

  public async create(scope: AccountingScope, data: PartnerData, tx?: Prisma.TransactionClient): Promise<Partner> {
    return this.db(tx).partner.create({ data: { userId: scope.ownerUserId, createdById: scope.actorUserId, ...data } });
  }

  public async update(_scope: AccountingScope, id: string, data: PartnerData, tx?: Prisma.TransactionClient): Promise<Partner> {
    return this.db(tx).partner.update({ where: { id }, data });
  }

  public async softDelete(_scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<Partner> {
    return this.db(tx).partner.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
