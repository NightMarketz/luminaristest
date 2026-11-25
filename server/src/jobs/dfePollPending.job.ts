/**
 * dfePollPending — BE-INCR-DFE (nó X10b, BRIEF item 27, JOB-005). Varre `FiscalDocument` em
 * `SENT|PROCESSING` mais velhos que `DFE_POLL_AFTER_MS` e re-consulta cada um via a porta
 * configurada. Prisma-direto (não passa pelo DynamicTable). A lógica de skip/alerta e a
 * reconstrução de `AccountingScope` por documento vivem em `FiscalDocumentLifecycleService`
 * (mesmo padrão de `accountingSyncReconcile.job.ts`) — este arquivo é só a fiação de produção.
 */
import { getFactory } from '../lib/factory';
import logger from '../lib/logger';
import type { AlertaDePoll, FaseFalhou, PollSummary } from '../features/accounting/services/FiscalDocumentLifecycleService';
import { readMsEnv } from './readMsEnv';

const JOB = 'dfe_poll_pending';
const DEFAULT_POLL_AFTER_MS = 120_000; // 2 minutos — dá tempo do parceiro responder antes de reconsultar

/** BRD F-71.1: inválido lança (antes caía no default em silêncio); o `DfePollScheduler.start()` lê no boot. */
export function readDfePollAfterMs(): number {
  return readMsEnv('DFE_POLL_AFTER_MS', DEFAULT_POLL_AFTER_MS, 0);
}

/**
 * Onda 4 / 4.1 (L1 do #1392) — cada fase DEPOIS do poll é isolada: a que lança é registrada (OBS-R8: `job.failed` com a fase) e
 * entra em `fasesFalharam`, as outras seguem no mesmo tick, e o `DfePollScheduler` emite os alertas do poll primeiro e depois o
 * `job_failed` da fase (OBS-R11). Desde a lacuna 2374 os marcadores "já alertei" (`pollGaveUpAt`/`pollAlertedAt`) não são mais
 * gravados por `pollPendingOnce`, e sim por `confirmarAlertaDePoll` depois da entrega do webhook: um `summary` perdido por uma
 * fase que lançou não perde mais o alerta de forma permanente (o documento volta no tick seguinte) — o isolamento segue valendo
 * para a fase não derrubar as outras nem o alerta do poll.
 */
async function fase<T>(nome: string, falhas: FaseFalhou[], run: () => Promise<T>): Promise<T | undefined> {
  try {
    return await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.event('error', 'job.failed', JOB, { job: JOB, fase: nome, error: message });
    falhas.push({ fase: nome, error: message });
    return undefined;
  }
}

export async function runDfePollPending(): Promise<PollSummary> {
  const olderThan = new Date(Date.now() - readDfePollAfterMs());
  const service = getFactory().getFiscalDocumentLifecycleService();
  const summary = await service.pollPendingOnce(olderThan);
  const falhas: FaseFalhou[] = [];
  // X10a PR-9 (decisões 6 e 7): transmite as NFC-e off-line, alerta o prazo e resolve as órfãs — antes do dreno, para a
  // NFC-e autorizada agora ganhar o anexo no mesmo tick.
  const contingencia = await fase('contingencia', falhas, () => getFactory().getNfceContingenciaService().tick(olderThan));
  // BE-INCR-DFE-EVENTOS PR-2 (item 18): eventos do fisco sobre as NFS-e autorizadas (cancelamento fora do Luminaris e
  // o em voo do item 19). Cancelar não cria anexo; a ordem em relação ao dreno não importa.
  const eventos = await fase('eventos', falhas, () => service.pollEventosOnce());
  // BE-INCR-DFE-ANEXO-PENDENTE item 7 (F-PA-2 a): mesmo tick, depois do poll.
  const attachments = await fase('anexos', falhas, () => service.drainPendingAttachmentsOnce());
  return { ...summary, contingencia, eventos, attachments, ...(falhas.length > 0 ? { fasesFalharam: falhas } : {}) };
}

/**
 * Lacuna 2374 — fiação de produção da confirmação: o scheduler a aciona depois que o webhook entregou o alerta (ou não há
 * webhook configurado), e só então o serviço grava o marcador "já alertei" dos documentos do alerta.
 */
export async function confirmarAlertasDePoll(tipo: AlertaDePoll, documentIds: readonly string[]): Promise<number> {
  return getFactory().getFiscalDocumentLifecycleService().confirmarAlertaDePoll(tipo, documentIds);
}
