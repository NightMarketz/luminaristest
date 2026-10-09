import prisma from '../../../lib/prisma';
import { Prisma, type IssBeneficioMunicipal } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { IIssBeneficioMunicipalRepository, IssBeneficioMunicipalData } from './IIssBeneficioMunicipalRepository';

const toDb = (d: IssBeneficioMunicipalData) => ({
  ...d,
  cTribNacPrefixos: d.cTribNacPrefixos as Prisma.InputJsonValue,
  reducaoBpPorFaixa: d.reducaoBpPorFaixa === null ? Prisma.DbNull : (d.reducaoBpPorFaixa as Prisma.InputJsonValue),
});

/** Prisma-backed `iss_beneficios_municipais` (SIMPLES-PISO-ANEXO-XI bloco 1). */
export class IssBeneficioMunicipalRepository implements IIssBeneficioMunicipalRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<IssBeneficioMunicipal | null> {
    return this.db(tx).issBeneficioMunicipal.findFirst({ where: { ...accountingScopeWhere(scope), id, deletedAt: null } });
  }

  public async listByScope(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<IssBeneficioMunicipal[]> {
    return this.db(tx).issBeneficioMunicipal.findMany({ where: { ...accountingScopeWhere(scope), deletedAt: null }, orderBy: [{ vigenteDesde: 'asc' }, { id: 'asc' }] });
  }

  public async create(scope: AccountingScope, data: IssBeneficioMunicipalData, tx?: Prisma.TransactionClient): Promise<IssBeneficioMunicipal> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return this.db(tx).issBeneficioMunicipal.create({ data: { userId, unitId, createdById: scope.actorUserId, updatedById: scope.actorUserId, ...toDb(data) } });
  }

  public async update(scope: AccountingScope, id: string, data: IssBeneficioMunicipalData, tx?: Prisma.TransactionClient): Promise<IssBeneficioMunicipal> {
    return this.db(tx).issBeneficioMunicipal.update({ where: { id }, data: { updatedById: scope.actorUserId, ...toDb(data) } });
  }

  public async softDelete(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.db(tx).issBeneficioMunicipal.update({ where: { id }, data: { deletedAt: new Date(), updatedById: scope.actorUserId } });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
