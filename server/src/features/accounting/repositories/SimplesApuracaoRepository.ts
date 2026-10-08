import prisma from '../../../lib/prisma';
import type { Prisma, SimplesApuracao } from 'generated/prisma';
import { accountingScopeWhere, type AccountingScope } from '../scope/AccountingScope';
import type { CreateSimplesApuracaoData, ISimplesApuracaoRepository } from './ISimplesApuracaoRepository';

/** Repositório Prisma de `simples_apuracoes` (X14 PR-3). Zero regra de negócio (ver o contrato). */
export class SimplesApuracaoRepository implements ISimplesApuracaoRepository {
  public async findConfirmada(scope: AccountingScope, competencia: string, tx?: Prisma.TransactionClient): Promise<SimplesApuracao | null> {
    return (tx ?? prisma).simplesApuracao.findFirst({
      where: { ...accountingScopeWhere(scope), competencia, status: 'CONFIRMED', deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<SimplesApuracao | null> {
    return (tx ?? prisma).simplesApuracao.findFirst({ where: { id, ...accountingScopeWhere(scope), deletedAt: null } });
  }

  public async supersede(scope: AccountingScope, id: string, tx: Prisma.TransactionClient): Promise<number> {
    const r = await tx.simplesApuracao.updateMany({ where: { id, ...accountingScopeWhere(scope), status: 'CONFIRMED' }, data: { status: 'SUPERSEDED' } });
    return r.count;
  }

  public async create(scope: AccountingScope, data: CreateSimplesApuracaoData, tx: Prisma.TransactionClient): Promise<SimplesApuracao> {
    return tx.simplesApuracao.create({ data: { ...accountingScopeWhere(scope), ...data, status: 'CONFIRMED', createdById: scope.actorUserId } });
  }

  public async setProvisaoEntryId(scope: AccountingScope, id: string, entryId: string): Promise<number> {
    const r = await prisma.simplesApuracao.updateMany({ where: { id, ...accountingScopeWhere(scope), provisaoEntryId: null }, data: { provisaoEntryId: entryId } });
    return r.count;
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
