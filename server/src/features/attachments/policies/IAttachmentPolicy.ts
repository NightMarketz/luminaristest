import type { IUser } from '../../users/public/user.types';

/**
 * Authorization contract for CRM attachments. Decisions only — no throws, no data access.
 */
export interface IAttachmentPolicy {
  /** True if the actor may view an attachment owned by ownerId. */
  canView(actor: IUser | null, ownerId: string): boolean;

  /** True if the actor may delete an attachment owned by ownerId. */
  canDelete(actor: IUser | null, ownerId: string): boolean;
}
