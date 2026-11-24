/**
 * dfeSignerHealth — X10a EMENDA-4 AL-15 (JOB-005). Só a fiação de produção: a regra dos três alertas vive no
 * `DfeSignerHealthService` (mesmo padrão de `dfePollPending.job.ts`).
 */
import { getFactory } from '../lib/factory';
import type { DfeSignerHealthSummary } from '../features/accounting/services/DfeSignerHealthService';

export async function runDfeSignerHealth(): Promise<DfeSignerHealthSummary> {
  return getFactory().getDfeSignerHealthService().verificar(new Date());
}
