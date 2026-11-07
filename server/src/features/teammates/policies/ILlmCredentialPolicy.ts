import type { IUser } from '../../users/models/User.model';

/** Autorização da credencial de IA. Decisão booleana pura, sem acesso a dado. */
export interface ILlmCredentialPolicy {
  /** Se o ator pode ler/criar/apagar credenciais do dono `ownerId`. */
  canManage(actor: IUser | null, ownerId: string): boolean;
}
