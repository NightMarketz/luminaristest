/**
 * Target entity types that can carry documentary evidence (BE-INCR-5).
 * BE-INCR-DFE F-DFE-19 → (b) (2026-09-17): FISCAL_DOCUMENT (XML/PDF autorizado) e
 * FISCAL_DOCUMENT_ATTEMPT (retorno de rejeição/homologação por tentativa). A FK a
 * journal_entries saiu do schema; a existência do alvo no escopo é gate do serviço.
 */
export const DOCUMENT_ATTACHMENT_TARGET_TYPES = ['JOURNAL_ENTRY', 'FISCAL_DOCUMENT', 'FISCAL_DOCUMENT_ATTEMPT'] as const;
export type DocumentAttachmentTargetType = (typeof DOCUMENT_ATTACHMENT_TARGET_TYPES)[number];

/**
 * Core accounting document-attachment entity within the application domain.
 * Decouples business logic from Prisma. Mirrors the DocumentAttachment Prisma model.
 * First-class (NOT CrmAttachment): two-level tenancy (userId + unitId), a scoped
 * (targetType, targetId) target without FK (F-DFE-19 b), a sha256 checksum, and audit-in-tx.
 */
export interface IDocumentAttachment {
  /** Unique identifier (cuid). */
  id: string;
  /** Scope owner (AccountingScope.ownerUserId). */
  userId: string;
  /** Business unit (scoped string, not a FK). */
  unitId: string;
  /** Polymorphic target type (DocumentAttachmentTargetType). */
  targetType: string;
  /** journal_entries.id | fiscal_documents.id | fiscal_document_attempts.id — plain string, no FK. */
  targetId: string;
  /** Sanitized display name (what is actually on disk). */
  fileName: string;
  mimeType: string;
  fileSize: number;
  /** sha256 hex (64 chars), computed server-side at upload. */
  sha256: string;
  /** Relative path within ATTACHMENTS_DIR (from attachmentStorage.saveFile). */
  storageKey: string;
  /** Actor who uploaded (AccountingScope.actorUserId). */
  uploadedById: string | null;
  /** Actor who soft-deleted; null while active. */
  deletedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Soft-delete marker; null when active. */
  deletedAt: Date | null;
}

/**
 * Input for creating an attachment row. fileName/mimeType/fileSize/sha256/storageKey
 * are all derived server-side (uploaded file + storage util + hash), never from the
 * client body.
 */
export interface CreateDocumentAttachmentInput {
  userId: string;
  unitId: string;
  targetType: DocumentAttachmentTargetType;
  targetId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  storageKey: string;
  uploadedById: string | null;
}
