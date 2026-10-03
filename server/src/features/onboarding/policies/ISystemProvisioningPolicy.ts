import type { UserContext } from '../../../types/UserContext';

/**
 * Authorization contract for system provisioning (onboarding / seed). Decisions only — no throws, no data access.
 */
export interface ISystemProvisioningPolicy {
  /** Setup é one-shot: só quem ainda não tem tabela dinâmica nenhuma (a guarda 403 de hoje). */
  canProvision(ctx: UserContext, existingTableCount: number): boolean;
}
