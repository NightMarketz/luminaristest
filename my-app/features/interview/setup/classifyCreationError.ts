import type { CreationErrorKind } from '../types/InterviewTypes';

/**
 * W7 item 4 (F-W7-2 a) — classifica a falha do `POST /dashboard/create` pelo status e pelo `errorCode` do corpo
 * (`dashboardController.respondProvisioningError`). `status` null = o fetch rejeitou (rede).
 */
export function classifyCreationError(status: number | null, body: { errorCode?: string } | null): CreationErrorKind {
  if (status === 403) return 'already-provisioned';
  if (status === 400) return 'invalid';
  if (body?.errorCode === 'ONBOARDING_ROLLBACK_FAILED') return 'partial';
  return 'retryable'; // rede, 5xx, ONBOARDING_ROLLED_BACK
}
