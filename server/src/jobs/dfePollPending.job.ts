/**
 * dfePollPending — BE-INCR-DFE (nó X10b, BRIEF item 27, JOB-005). Varre `FiscalDocument` em
 * `SENT|PROCESSING` mais velhos que `DFE_POLL_AFTER_MS` e re-consulta cada um via a porta
 * configurada. Prisma-direto (não passa pelo DynamicTable). A lógica de skip/alerta e a
 * reconstrução de `AccountingScope` por documento vivem em `FiscalDocumentLifecycleService`
 * (mesmo padrão de `accountingSyncReconcile.job.ts`) — este arquivo é só a fiação de produção.
 */
import { getFactory } from '../lib/factory';
import type { PollSummary } from '../features/accounting/services/FiscalDocumentLifecycleService';
import { readMsEnv } from './readMsEnv';

const DEFAULT_POLL_AFTER_MS = 120_000; // 2 minutos — dá tempo do parceiro responder antes de reconsultar

/** BRD F-71.1: inválido lança (antes caía no default em silêncio); o `DfePollScheduler.start()` lê no boot. */
export function readDfePollAfterMs(): number {
  return readMsEnv('DFE_POLL_AFTER_MS', DEFAULT_POLL_AFTER_MS, 0);
}

export async function runDfePollPending(): Promise<PollSummary> {
  const olderThan = new Date(Date.now() - readDfePollAfterMs());
  const service = getFactory().getFiscalDocumentLifecycleService();
  const summary = await service.pollPendingOnce(olderThan);
  // X10a PR-9 (decisões 6 e 7): transmite as NFC-e off-line, alerta o prazo e resolve as órfãs — antes do dreno, para a
  // NFC-e autorizada agora ganhar o anexo no mesmo tick.
  const contingencia = await getFactory().getNfceContingenciaService().tick(olderThan);
  // BE-INCR-DFE-EVENTOS PR-2 (item 18): eventos do fisco sobre as NFS-e autorizadas (cancelamento fora do Luminaris e
  // o em voo do item 19). Cancelar não cria anexo; a ordem em relação ao dreno não importa.
  const eventos = await service.pollEventosOnce();
  // BE-INCR-DFE-ANEXO-PENDENTE item 7 (F-PA-2 a): mesmo tick, depois do poll.
  const attachments = await service.drainPendingAttachmentsOnce();
  return { ...summary, contingencia, eventos, attachments };
}
