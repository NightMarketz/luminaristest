import prisma from '../../../lib/prisma';
import type { NfceContingencia, NfceContingenciaOrfa, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { CreateOrfaData, INfceContingenciaRepository, OrfaPatch, OrigemContingencia } from './INfceContingenciaRepository';

/** Repositório Prisma de `nfce_contingencias` e `nfce_contingencia_orfas` (X10a PR-9). Zero regra de negócio. */
export class NfceContingenciaRepository implements INfceContingenciaRepository {
  public async findEstado(scope: AccountingScope, ambiente: string, tx?: Prisma.TransactionClient): Promise<NfceContingencia | null> {
    return (tx ?? prisma).nfceContingencia.findFirst({ where: { ...accountingScopeWhere(scope), ambiente } });
  }

  public async ligar(
    scope: AccountingScope,
    ambiente: string,
    data: { origem: OrigemContingencia; dhCont: Date; xJust: string },
    tx?: Prisma.TransactionClient,
  ): Promise<NfceContingencia> {
    const { userId, unitId } = accountingScopeWhere(scope);
    return (tx ?? prisma).nfceContingencia.upsert({
      where: { userId_unitId_ambiente: { userId, unitId, ambiente } },
      create: { userId, unitId, ambiente, ativa: true, ...data },
      update: { ativa: true, ...data },
    });
  }

  public async desligar(scope: AccountingScope, ambiente: string, soOrigem?: OrigemContingencia, tx?: Prisma.TransactionClient): Promise<boolean> {
    const r = await (tx ?? prisma).nfceContingencia.updateMany({
      where: { ...accountingScopeWhere(scope), ambiente, ativa: true, ...(soOrigem ? { origem: soOrigem } : {}) },
      data: { ativa: false },
    });
    return r.count > 0;
  }

  public async createOrfa(scope: AccountingScope, data: CreateOrfaData, tx?: Prisma.TransactionClient): Promise<NfceContingenciaOrfa> {
    return (tx ?? prisma).nfceContingenciaOrfa.create({ data: { ...accountingScopeWhere(scope), ...data, status: 'PENDING' } });
  }

  public async listOrfasPendentes(olderThan: Date, limit: number, tx?: Prisma.TransactionClient): Promise<NfceContingenciaOrfa[]> {
    return (tx ?? prisma).nfceContingenciaOrfa.findMany({
      where: { status: 'PENDING', createdAt: { lt: olderThan } },
      orderBy: [{ createdAt: 'asc' }],
      take: limit,
    });
  }

  public async listOrfasDosDocumentos(scope: AccountingScope, documentIds: readonly string[], tx?: Prisma.TransactionClient): Promise<NfceContingenciaOrfa[]> {
    if (documentIds.length === 0) return [];
    return (tx ?? prisma).nfceContingenciaOrfa.findMany({ where: { ...accountingScopeWhere(scope), documentId: { in: [...documentIds] } } });
  }

  public async updateOrfa(id: string, patch: OrfaPatch, tx?: Prisma.TransactionClient): Promise<NfceContingenciaOrfa> {
    return (tx ?? prisma).nfceContingenciaOrfa.update({ where: { id }, data: patch });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
