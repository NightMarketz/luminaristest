import type { UserContext } from '../../../types/UserContext';
import type { ISystemProvisioningPolicy } from './ISystemProvisioningPolicy';

/**
 * Regra "setup só uma vez" (BE-INCR-SEED-UNIDADE-E-ENV, F-P7 → a): vale para o onboarding HTTP e para o seed.
 * Pure boolean decision — no throws, no data access.
 */
export class SystemProvisioningPolicy implements ISystemProvisioningPolicy {
  canProvision(_ctx: UserContext, existingTableCount: number): boolean {
    return existingTableCount === 0;
  }

  /** BE-INCR-RESET-CONSISTENTE item 4 (E13): o reset só alcança o sistema do próprio `ctx` — todo autenticado pode. */
  canResetSystem(_ctx: UserContext): boolean {
    return true;
  }
}
