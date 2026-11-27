import type { UserContext } from '../../../lib/authUtils';
import type { ISchedulingPolicy } from './ISchedulingPolicy';

/** Item 34 — o usuário autenticado lê a escala da própria unidade viva; unidade de outro dono ou apagada não é lida. */
export class SchedulingPolicy implements ISchedulingPolicy {
  canRead(user: UserContext, unitState: 'live' | 'deleted' | null): boolean {
    return !!user.userId && unitState === 'live';
  }
}
