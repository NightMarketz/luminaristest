import type { IUser } from '../../users/models/User.model';
import type { ILlmCredentialPolicy } from './ILlmCredentialPolicy';

/**
 * Só o próprio tenant gerencia a sua chave de IA (escopo por `userId`, BRIEF item 10). Sem exceção de ADMIN: a chave é
 * do cliente no provedor (F-TM-6 b), e a credencial de outro dono responde 404 no service.
 */
export class LlmCredentialPolicy implements ILlmCredentialPolicy {
  public canManage(actor: IUser | null, ownerId: string): boolean {
    return !!actor && actor.id === ownerId;
  }
}
