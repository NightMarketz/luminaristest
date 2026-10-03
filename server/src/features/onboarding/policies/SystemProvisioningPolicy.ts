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
}
