/**
 * alertWebhook — fire-and-forget outbound alert for operational events that need a human's
 * attention outside the log file: a reconcile summary with `blocked>0 || failed>0` (scheduler
 * and CLI, same criterion — F-W2C-2), and the three export-job `FAILED` catches
 * (SpedGenerationService/SpedEcfGenerationService/DataExchangeExportService).
 *
 * `ALERT_WEBHOOK_URL` is optional: unset means no-op, not a warning — absence is valid
 * configuration. `sendAlertWebhook` is never `await`ed at the call site by design (the job that
 * triggered the alert must never slow down or fail because the webhook endpoint is slow or
 * unreachable). Any failure — network error, non-2xx response, or the timeout below — collapses
 * into a single `logger.warn` and never propagates to the caller.
 *
 * Lacuna 2374 (dono, 25/11/2026): a caller that persists a "já alertei" marker needs to know whether
 * the alert was actually delivered. `deliverAlertWebhook` is the SAME delivery, awaitable, and
 * resolves to the outcome (`delivered` | `disabled` | `failed`) — it never rejects either. The
 * fire-and-forget `sendAlertWebhook` is now just `void deliverAlertWebhook(...)`: same request,
 * same single `alert.failed` line, so its callers see no change.
 */
import logger from './logger';

/** Fire-and-forget budget for the outbound POST; no retry. */
const ALERT_WEBHOOK_TIMEOUT_MS = 3000;

/** Placeholder logged when ALERT_WEBHOOK_URL does not parse — the raw value never reaches the log. */
const INVALID_URL_ORIGIN = '[invalid-url]';

/**
 * The only part of the sink URL that may be logged (OBS-R7, L-20261124-193344-5803): a Slack/Discord/
 * Teams webhook carries its secret in the path or the query, so the log names the origin
 * (protocol + host + port) and nothing else.
 */
function sinkOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return INVALID_URL_ORIGIN;
  }
}

/** The `alert.failed` fields shared by both catch paths; an error message that echoes the URL is scrubbed to the origin. */
function failureFields(url: string, payload: AlertPayload, error: unknown): Record<string, unknown> {
  const hasNameAndMessage =
    typeof error === 'object' && error !== null && 'name' in error && 'message' in error;
  const origin = sinkOrigin(url);
  const rawMessage = hasNameAndMessage ? String((error as { message: unknown }).message) : String(error);
  return {
    urlOrigin: origin,
    source: payload.source,
    alertEvent: payload.event,
    errorName: hasNameAndMessage ? String((error as { name: unknown }).name) : 'UnknownError',
    errorMessage: rawMessage.split(url).join(origin),
  };
}

export interface AlertPayload {
  source:
    | 'accounting_sync_reconcile' | 'sped_ecd' | 'sped_ecf' | 'data_exchange_export'
    // Nó OBS, item 10: the 5 schedulers that only logged their failure, and the process itself.
    | 'dfe_poll' | 'collection_charge_poll' | 'mp_release_report' | 'legal_params_recalc' | 'ptax_rate' | 'process'
    // BE-INCR-RAG-DOCUMENTOS RAG-PR-A item 9 (caminho 2).
    | 'vec_orphan_sweep'
    // EFX F-19.1: passo da purga LGPD que falhou (os outros seguem no mesmo ciclo).
    | 'purge_deleted_records'
    // EFX F-18.2: a varredura de job de exportação preso em PROCESSING.
    | 'data_exchange_stale_sweep'
    // CANCELLING PR-0 (0.9): pendência de cancelamento/estorno que não se resolve sozinha (BLOCKED determinístico) — o job de re-drive (PR-2) usa a mesma origem.
    | 'subledger_redrive';
  event: 'reconcile_summary' | 'generation_failed' | 'job_failed' | 'uncaught_exception' | 'blocked_permanent';
  timestamp: string; // ISO
  [key: string]: unknown; // free-form fields per trigger (failed, blocked, jobId, kind…)
}

/**
 * Outcome of one delivery attempt (lacuna 2374). `disabled` = no `ALERT_WEBHOOK_URL`: there is no channel to wait for, which is
 * valid configuration and NOT a failure — a caller gating a marker on delivery must treat it as settled, or an install without
 * a webhook would never record anything. `failed` = the alert did not reach the endpoint (already logged as `alert.failed`).
 */
export type AlertDelivery = 'delivered' | 'disabled' | 'failed';

function logDeliveryFailure(url: string, payload: AlertPayload, error: unknown): void {
  // fetch() can reject with heterogeneous error shapes (DOMException on abort, TypeError on network failure, a plain object):
  // failureFields reads name/message structurally and logs only the sink origin, never the secret-bearing URL (5803).
  logger.event('warn', 'alert.failed', 'alert webhook failed', failureFields(url, payload, error));
}

/**
 * Awaitable delivery: resolves once the endpoint answered 2xx (`delivered`), there is nothing configured (`disabled`) or the
 * attempt failed (`failed`, logged once as `alert.failed`). Never rejects. Costs up to the timeout above when the endpoint hangs,
 * so only a caller that needs the outcome should `await` it. No retry here: the caller retries by alerting again on its next run.
 */
export async function deliverAlertWebhook(payload: AlertPayload): Promise<AlertDelivery> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return 'disabled';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ALERT_WEBHOOK_TIMEOUT_MS);
  try {
    // JSON.stringify(payload) and the fetch() call itself can throw synchronously (e.g. a circular payload) — inside the try.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`alert webhook responded with status ${res.status}`);
    return 'delivered';
  } catch (error) {
    logDeliveryFailure(url, payload, error);
    return 'failed';
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fire-and-forget: callers must NOT `await` this. Never throws and never rejects visibly — `deliverAlertWebhook` resolves
 * (never rejects), so there is nothing for an unhandledRejection listener to see either. Use `deliverAlertWebhook` when the
 * outcome matters.
 */
export function sendAlertWebhook(payload: AlertPayload): void {
  void deliverAlertWebhook(payload);
}
