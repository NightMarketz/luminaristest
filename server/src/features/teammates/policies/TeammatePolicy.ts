import type { IUser } from '../../users/models/User.model';
import type { ITeammatePolicy } from './ITeammatePolicy';

/**
 * Só o próprio tenant gerencia os seus teammates (escopo por `userId`, BRIEF item 10). Mesmo molde do
 * `LlmCredentialPolicy` (sem exceção de ADMIN, L-PR1-4); o teammate de outro dono responde 404 no service.
 */
export class TeammatePolicy implements ITeammatePolicy {
  public canManage(actor: IUser | null, ownerId: string): boolean {
    return !!actor && actor.id === ownerId;
  }
}
