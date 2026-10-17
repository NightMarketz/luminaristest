import type { CrmAttachment } from 'generated/prisma';
import type { CreateAttachmentInput } from '../models/Attachment.model';

/**
 * Contract for CRM attachment data access. Soft-delete universal: reads filter
 * deletedAt: null and delete is an update of deletedAt (never prisma.delete()).
 */
export interface IAttachmentRepository {
  /** Persists a new attachment metadata row. */
  create(data: CreateAttachmentInput): Promise<CrmAttachment>;

  /** Finds an active (non-deleted) attachment by id, or null. */
  findById(id: string): Promise<CrmAttachment | null>;

  /**
   * Lists active attachments for a given parent record, scoped to the owner.
   * Ordered by createdAt desc.
   */
  findManyByEntity(
    userId: string,
    entityType: string,
    entityId: string,
  ): Promise<CrmAttachment[]>;

  /** Soft-deletes an attachment (sets deletedAt). */
  softDelete(id: string): Promise<CrmAttachment>;

  /**
   * Soft-deletes every active attachment of the user (reset do sistema, I7 item 2) and returns the rows it
   * soft-deleted, so the caller can remove each binary (`storageKey`) best-effort.
   */
  softDeleteByUserId(userId: string): Promise<CrmAttachment[]>;
}
