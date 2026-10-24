import prisma from '../../../lib/prisma';
import type { Prisma, WithholdingProfile } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { PerfilRetencaoDados } from '../models/withholdingProfile';
import type { IWithholdingProfileRepository } from './IWithholdingProfileRepository';

/** Prisma-backed `withholding_profiles` (RETENCOES-FONTE PR-1, item 6). Soft-delete; linha viva = `deletedAt: null`. */
export class WithholdingProfileRepository implements IWithholdingProfileRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async list(scope: AccountingScope, counterpartyId?: string, tx?: Prisma.TransactionClient): Promise<WithholdingProfile[]> {
    return this.db(tx).withholdingProfile.findMany({
      where: { ...accountingScopeWhere(scope), ...(counterpartyId ? { counterpartyId } : {}), deletedAt: null },
      orderBy: [{ counterpartyId: 'asc' }, { naturezaServico: 'asc' }, { vigenteDesde: 'asc' }],
    });
  }

  public async findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<WithholdingProfile | null> {
    return this.db(tx).withholdingProfile.findFirst({ where: { id, ...accountingScopeWhere(scope), deletedAt: null } });
  }

  public async listByCounterpartyAndNatureza(
    scope: AccountingScope,
    counterpartyId: string,
    naturezaServico: string,
    tx?: Prisma.TransactionClient,
  ): Promise<WithholdingProfile[]> {
    return this.db(tx).withholdingProfile.findMany({ where: { ...accountingScopeWhere(scope), counterpartyId, naturezaServico, deletedAt: null } });
  }

  public async create(scope: AccountingScope, counterpartyId: string, data: PerfilRetencaoDados, tx?: Prisma.TransactionClient): Promise<WithholdingProfile> {
    return this.db(tx).withholdingProfile.create({
      data: { ...accountingScopeWhere(scope), counterpartyId, ...data, createdById: scope.actorUserId, updatedById: scope.actorUserId },
    });
  }

  public async update(scope: AccountingScope, id: string, data: PerfilRetencaoDados, tx?: Prisma.TransactionClient): Promise<WithholdingProfile> {
    return this.db(tx).withholdingProfile.update({ where: { id, ...accountingScopeWhere(scope) }, data: { ...data, updatedById: scope.actorUserId } });
  }

  public async softDelete(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<WithholdingProfile> {
    return this.db(tx).withholdingProfile.update({ where: { id, ...accountingScopeWhere(scope) }, data: { deletedAt: new Date(), updatedById: scope.actorUserId } });
  }

  public async runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
