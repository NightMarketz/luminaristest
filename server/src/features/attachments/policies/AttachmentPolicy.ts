import type { IUser } from '../../users/public/user.types';
import { Role } from '../../users/public/user.types';
import type { IAttachmentPolicy } from './IAttachmentPolicy';

/**
 * Authorization rules for CRM attachments. ADMIN may act on any; otherwise the actor
 * must be the owner. Pure boolean decisions — no throws, no data access.
 */
export class AttachmentPolicy implements IAttachmentPolicy {
  canView(actor: IUser | null, ownerId: string): boolean {
    if (!actor) return false;
    return actor.role === Role.ADMIN || actor.id === ownerId;
  }

  canDelete(actor: IUser | null, ownerId: string): boolean {
    if (!actor) return false;
    return actor.role === Role.ADMIN || actor.id === ownerId;
  }
}
