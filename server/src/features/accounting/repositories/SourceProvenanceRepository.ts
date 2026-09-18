import prisma from '../../../lib/prisma';
import type { JournalEntrySource, Prisma, SourceDocument } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type {
  CreateJournalEntrySourceInput,
  CreateSourceDocumentInput,
  ISourceProvenanceRepository,
  JournalEntrySourceWithDocument,
} from './ISourceProvenanceRepository';

/**
 * Prisma-backed repository for formal provenance (`source_documents`,
 * `journal_entry_sources`) — BE-INCR-8 / ADR-INCR8. Only place the provenance layer
 * touches prisma.*. DESCRIPTIVE only: never writes a ledger value (no Posting/debit/
 * credit/status). No idempotency key of its own — dedup lives in JournalEntry.@@unique
 * (T7, D2); a re-post short-circuits before the seam ever runs, so origins are not
 * duplicated. Tenancy = AccountingScope (userId + unitId, plain scope strings — same
 * convention as DocumentAttachment/ReconciliationRepository). SQLite.
 */
export class SourceProvenanceRepository implements ISourceProvenanceRepository {
  public async createSourceDocument(
    data: CreateSourceDocumentInput,
    tx?: Prisma.TransactionClient,
  ): Promise<SourceDocument> {
    return (tx ?? prisma).sourceDocument.create({
      data: {
        userId: data.userId,
        unitId: data.unitId,
        sourceType: data.sourceType,
        externalRef: data.externalRef ?? null,
        documentDate: data.documentDate ?? null,
        description: data.description ?? null,
        attachmentId: data.attachmentId ?? null,
        rawJson: data.rawJson ?? null,
        createdById: data.createdById ?? null,
      },
    });
  }

  public async linkEntry(
    data: CreateJournalEntrySourceInput,
    tx?: Prisma.TransactionClient,
  ): Promise<JournalEntrySource> {
    return (tx ?? prisma).journalEntrySource.create({
      data: {
        userId: data.userId,
        unitId: data.unitId,
        journalEntryId: data.journalEntryId,
        sourceDocumentId: data.sourceDocumentId,
      },
    });
  }

  public async findSourcesByEntry(
    scope: AccountingScope,
    journalEntryId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<JournalEntrySourceWithDocument[]> {
    return (tx ?? prisma).journalEntrySource.findMany({
      // F-DFE-18 (a): retirado (deletedAt != null) some do drill-down por padrão — o link em si
      // não é apagado (a trilha de QUE algo esteve anexado sobrevive), só o documento de origem.
      where: { journalEntryId, ...accountingScopeWhere(scope), sourceDocument: { deletedAt: null } },
      include: { sourceDocument: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  public async softDeleteSourceDocument(
    scope: AccountingScope,
    sourceDocumentId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<SourceDocument> {
    const db = tx ?? prisma;
    const r = await db.sourceDocument.updateMany({
      where: { id: sourceDocumentId, ...accountingScopeWhere(scope), deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (r.count !== 1) {
      throw new Error(`source_document_not_found_or_already_retired: ${sourceDocumentId}`);
    }
    return db.sourceDocument.findFirst({ where: { id: sourceDocumentId } }) as Promise<SourceDocument>;
  }
}
