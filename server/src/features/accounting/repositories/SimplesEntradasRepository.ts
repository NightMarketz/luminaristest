import prisma from '../../../lib/prisma';
import type { Prisma, SalaoParceriaContrato, SimplesHistoricoMensal, SimplesSegregacaoManual } from 'generated/prisma';
import { accountingScopeWhere, type AccountingScope } from '../scope/AccountingScope';
import type { HistoricoData, ISimplesEntradasRepository, ParceriaData } from './ISimplesEntradasRepository';

/** Repositório Prisma das entradas do Simples (X14 PR-2). Zero regra de negócio (ver o contrato). */
export class SimplesEntradasRepository implements ISimplesEntradasRepository {
  public async upsertHistorico(scope: AccountingScope, competencia: string, data: HistoricoData, tx?: Prisma.TransactionClient): Promise<SimplesHistoricoMensal> {
    const w = accountingScopeWhere(scope);
    return (tx ?? prisma).simplesHistoricoMensal.upsert({
      where: { userId_unitId_competencia: { ...w, competencia } },
      create: { ...w, competencia, ...data, createdById: scope.actorUserId, updatedById: scope.actorUserId },
      update: { ...data, updatedById: scope.actorUserId },
    });
  }

  public async findHistorico(scope: AccountingScope, competencias: readonly string[], tx?: Prisma.TransactionClient): Promise<SimplesHistoricoMensal[]> {
    return (tx ?? prisma).simplesHistoricoMensal.findMany({
      where: { ...accountingScopeWhere(scope), competencia: { in: [...competencias] } },
      orderBy: { competencia: 'asc' },
    });
  }

  public async upsertSegregacao(scope: AccountingScope, competencia: string, parcelas: Prisma.InputJsonValue, tx?: Prisma.TransactionClient): Promise<SimplesSegregacaoManual> {
    const w = accountingScopeWhere(scope);
    return (tx ?? prisma).simplesSegregacaoManual.upsert({
      where: { userId_unitId_competencia: { ...w, competencia } },
      create: { ...w, competencia, parcelas, createdById: scope.actorUserId, updatedById: scope.actorUserId },
      update: { parcelas, updatedById: scope.actorUserId },
    });
  }

  public async findSegregacao(scope: AccountingScope, competencia: string, tx?: Prisma.TransactionClient): Promise<SimplesSegregacaoManual | null> {
    return (tx ?? prisma).simplesSegregacaoManual.findUnique({ where: { userId_unitId_competencia: { ...accountingScopeWhere(scope), competencia } } });
  }

  public async sourceDocumentExists(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    return (await (tx ?? prisma).sourceDocument.count({ where: { id, ...accountingScopeWhere(scope) } })) > 0;
  }

  public async createParceria(scope: AccountingScope, data: ParceriaData, tx?: Prisma.TransactionClient): Promise<SalaoParceriaContrato> {
    return (tx ?? prisma).salaoParceriaContrato.create({
      data: { ...accountingScopeWhere(scope), ...data, createdById: scope.actorUserId, updatedById: scope.actorUserId },
    });
  }

  public async updateParceria(scope: AccountingScope, id: string, data: Partial<ParceriaData>, tx?: Prisma.TransactionClient): Promise<SalaoParceriaContrato> {
    const c = tx ?? prisma;
    await c.salaoParceriaContrato.updateMany({ where: { id, ...accountingScopeWhere(scope), deletedAt: null }, data: { ...data, updatedById: scope.actorUserId } });
    return c.salaoParceriaContrato.findFirstOrThrow({ where: { id, ...accountingScopeWhere(scope) } });
  }

  public async softDeleteParceria(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? prisma).salaoParceriaContrato.updateMany({
      where: { id, ...accountingScopeWhere(scope), deletedAt: null },
      data: { deletedAt: new Date(), updatedById: scope.actorUserId },
    });
  }

  public async findParceria(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<SalaoParceriaContrato | null> {
    return (tx ?? prisma).salaoParceriaContrato.findFirst({ where: { id, ...accountingScopeWhere(scope), deletedAt: null } });
  }

  public async listParcerias(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<SalaoParceriaContrato[]> {
    return (tx ?? prisma).salaoParceriaContrato.findMany({
      where: { ...accountingScopeWhere(scope), deletedAt: null },
      orderBy: [{ vigenteDesde: 'desc' }, { id: 'asc' }],
    });
  }

  public async findParceriasDoProfissional(scope: AccountingScope, profissionalContactId: string, tx?: Prisma.TransactionClient): Promise<SalaoParceriaContrato[]> {
    return (tx ?? prisma).salaoParceriaContrato.findMany({
      where: { ...accountingScopeWhere(scope), profissionalContactId, deletedAt: null },
      orderBy: [{ vigenteDesde: 'desc' }, { id: 'asc' }],
    });
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }

  public async findParceriaMesmoRemovida(scope: AccountingScope, ids: readonly string[]): Promise<SalaoParceriaContrato[]> {
    return prisma.salaoParceriaContrato.findMany({ where: { ...accountingScopeWhere(scope), id: { in: [...ids] } } });
  }

  public async findHistoricoTx(scope: AccountingScope, competencias: readonly string[], tx: Prisma.TransactionClient): Promise<SimplesHistoricoMensal[]> {
    return this.findHistorico(scope, competencias, tx);
  }
}
