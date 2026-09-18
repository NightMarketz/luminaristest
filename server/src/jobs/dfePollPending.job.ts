/**
 * dfePollPending — BE-INCR-DFE (nó X10b, BRIEF item 27, JOB-005). Varre `FiscalDocument` em
 * `SENT|PROCESSING` mais velhos que `DFE_POLL_AFTER_MS` e re-consulta cada um via a porta
 * configurada. Prisma-direto (não passa pelo DynamicTable). A lógica de skip/alerta e a
 * reconstrução de `AccountingScope` por documento vivem em `FiscalDocumentLifecycleService`
 * (mesmo padrão de `accountingSyncReconcile.job.ts`) — este arquivo é só a fiação de produção.
 */
import { getFactory } from '../lib/factory';
import type { PollSummary } from '../features/accounting/services/FiscalDocumentLifecycleService';

const DEFAULT_POLL_AFTER_MS = 120_000; // 2 minutos — dá tempo do parceiro responder antes de reconsultar

function readMsEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

export async function runDfePollPending(): Promise<PollSummary> {
  const olderThan = new Date(Date.now() - readMsEnv('DFE_POLL_AFTER_MS', DEFAULT_POLL_AFTER_MS));
  return getFactory().getFiscalDocumentLifecycleService().pollPendingOnce(olderThan);
}
