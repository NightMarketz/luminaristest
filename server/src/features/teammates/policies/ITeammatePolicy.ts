import type { IUser } from '../../users/models/User.model';

/** Autorização do teammate. Decisão booleana pura, sem acesso a dado. */
export interface ITeammatePolicy {
  /** Se o ator pode ler/criar/editar/apagar teammates do dono `ownerId`. */
  canManage(actor: IUser | null, ownerId: string): boolean;
}
