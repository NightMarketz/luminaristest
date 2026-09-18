import prisma from '../../../lib/prisma';
import type { FiscalDocument, FiscalDocumentAttempt, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type {
  AppendAttemptData,
  CreateSentFiscalDocumentData,
  FiscalDocumentKind,
  FiscalDocumentStatus,
  FiscalDocumentWithAttempts,
  IFiscalDocumentRepository,
  TransitionData,
} from './IFiscalDocumentRepository';

export function attemptRef(documentId: string, attemptNo: number): string {
  return `${documentId}:${attemptNo}`;
}

/** Prisma-backed `fiscal_documents` + `fiscal_document_attempts` + `fiscal_document_sequences` (BRIEF itens 3-5). */
export class FiscalDocumentRepository implements IFiscalDocumentRepository {
  private db(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  public async findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<FiscalDocumentWithAttempts | null> {
    return this.db(tx).fiscalDocument.findFirst({
      where: { id, ...accountingScopeWhere(scope), deletedAt: null },
      include: { attempts: { orderBy: { attemptNo: 'asc' } } },
    });
  }

  public async findAttemptById(scope: AccountingScope, attemptId: string, tx?: Prisma.TransactionClient): Promise<FiscalDocumentAttempt | null> {
    return this.db(tx).fiscalDocumentAttempt.findFirst({
      where: { id: attemptId, document: { ...accountingScopeWhere(scope), deletedAt: null } },
    });
  }

  public async findLiveBySale(scope: AccountingScope, saleId: string, kind?: FiscalDocumentKind, tx?: Prisma.TransactionClient): Promise<FiscalDocument[]> {
    return this.db(tx).fiscalDocument.findMany({
      where: { ...accountingScopeWhere(scope), saleId, deletedAt: null, status: { not: 'CANCELLED' }, ...(kind ? { kind } : {}) },
      orderBy: [{ kind: 'asc' }, { cTribNac: 'asc' }],
    });
  }

  public async listBySale(scope: AccountingScope, saleId: string, tx?: Prisma.TransactionClient): Promise<FiscalDocumentWithAttempts[]> {
    return this.db(tx).fiscalDocument.findMany({
      where: { ...accountingScopeWhere(scope), saleId, deletedAt: null },
      include: { attempts: { orderBy: { attemptNo: 'asc' } } },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  public async listByStatus(scope: AccountingScope, status: FiscalDocumentStatus, tx?: Prisma.TransactionClient): Promise<FiscalDocument[]> {
    return this.db(tx).fiscalDocument.findMany({
      where: { ...accountingScopeWhere(scope), status, deletedAt: null },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  public async listPending(olderThan: Date, tx?: Prisma.TransactionClient): Promise<FiscalDocument[]> {
    return this.db(tx).fiscalDocument.findMany({
      where: { status: { in: ['SENT', 'PROCESSING'] }, deletedAt: null, updatedAt: { lt: olderThan } },
      orderBy: [{ updatedAt: 'asc' }],
    });
  }

  public async findByPartnerRef(partnerRef: string, tx?: Prisma.TransactionClient): Promise<FiscalDocument | null> {
    return this.db(tx).fiscalDocument.findFirst({
      where: { partnerRef, status: { in: ['SENT', 'PROCESSING'] }, deletedAt: null },
    });
  }

  public async createSent(scope: AccountingScope, data: CreateSentFiscalDocumentData, tx?: Prisma.TransactionClient): Promise<FiscalDocumentWithAttempts> {
    const { userId, unitId } = accountingScopeWhere(scope);
    const { payloadJson, ...doc } = data;
    const created = await this.db(tx).fiscalDocument.create({
      data: {
        userId,
        unitId,
        ...doc,
        saleKey: data.saleId,
        status: 'SENT',
        currentAttemptNo: 1,
        createdById: scope.actorUserId,
      },
    });
    await this.db(tx).fiscalDocumentAttempt.create({
      data: { documentId: created.id, attemptNo: 1, ref: attemptRef(created.id, 1), payloadJson },
    });
    return (await this.findById(scope, created.id, tx)) as FiscalDocumentWithAttempts;
  }

  public async appendAttempt(scope: AccountingScope, data: AppendAttemptData, tx?: Prisma.TransactionClient): Promise<FiscalDocumentAttempt> {
    const doc = await this.db(tx).fiscalDocument.findFirst({ where: { id: data.documentId, ...accountingScopeWhere(scope), deletedAt: null } });
    if (!doc) throw new Error(`fiscal_document_not_found: ${data.documentId}`);
    return this.db(tx).fiscalDocumentAttempt.create({
      data: { documentId: doc.id, attemptNo: data.attemptNo, ref: attemptRef(doc.id, data.attemptNo), payloadJson: data.payloadJson },
    });
  }

  public async transition(scope: AccountingScope, id: string, data: TransitionData, tx?: Prisma.TransactionClient): Promise<FiscalDocument> {
    const { attemptResult, ...fields } = data;
    const r = await this.db(tx).fiscalDocument.updateMany({
      where: { id, ...accountingScopeWhere(scope), deletedAt: null },
      data: fields,
    });
    if (r.count !== 1) throw new Error(`fiscal_document_not_found: ${id}`);
    if (attemptResult) {
      await this.db(tx).fiscalDocumentAttempt.update({
        where: { documentId_attemptNo: { documentId: id, attemptNo: attemptResult.attemptNo } },
        data: { resultStatus: attemptResult.resultStatus, resultJson: attemptResult.resultJson },
      });
    }
    return (await this.db(tx).fiscalDocument.findFirst({ where: { id } })) as FiscalDocument;
  }

  public async nextNumber(scope: AccountingScope, kind: FiscalDocumentKind, serie: number, tx: Prisma.TransactionClient): Promise<bigint> {
    const { userId, unitId } = accountingScopeWhere(scope);
    const row = await tx.fiscalDocumentSequence.upsert({
      where: { userId_unitId_kind_serie: { userId, unitId, kind, serie } },
      create: { userId, unitId, kind, serie, last: 1n },
      update: { last: { increment: 1n } },
    });
    return row.last;
  }

  public async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}
