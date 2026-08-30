/**
 * alertWebhook — fire-and-forget outbound alert for operational events that need a human's
 * attention outside the log file: a reconcile summary with `blocked>0 || failed>0` (scheduler
 * and CLI, same criterion — F-W2C-2), and the three export-job `FAILED` catches
 * (SpedGenerationService/SpedEcfGenerationService/DataExchangeExportService).
 *
 * `ALERT_WEBHOOK_URL` is optional: unset means no-op, not a warning — absence is valid
 * configuration. Never `await`ed at the call site by design (the job that triggered the alert
 * must never slow down or fail because the webhook endpoint is slow or unreachable). Any
 * failure — network error, non-2xx response, or the timeout below — collapses into a single
 * `logger.warn` and never propagates to the caller.
 */
import logger from './logger';

/** Fire-and-forget budget for the outbound POST; no retry. */
const ALERT_WEBHOOK_TIMEOUT_MS = 3000;

export interface AlertPayload {
  source: 'accounting_sync_reconcile' | 'sped_ecd' | 'sped_ecf' | 'data_exchange_export';
  event: 'reconcile_summary' | 'generation_failed';
  timestamp: string; // ISO
  [key: string]: unknown; // free-form fields per trigger (failed, blocked, jobId, kind…)
}

/**
 * Fire-and-forget: callers must NOT `await` this. Never throws and never rejects visibly — the
 * returned promise chain always resolves via its own `.catch`, so there is nothing for an
 * unhandledRejection listener to see either.
 */
export function sendAlertWebhook(payload: AlertPayload): void {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ALERT_WEBHOOK_TIMEOUT_MS);

  // The whole synchronous assembly below — JSON.stringify(payload) and the fetch() call itself —
  // can throw before any promise exists to catch it (e.g. a circular payload throws a sync
  // TypeError). Wrapping it keeps the "never throws" contract even in that case.
  try {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`alert webhook responded with status ${res.status}`);
      })
      .catch((error) => {
        // fetch() can reject with heterogeneous error shapes depending on the failure mode —
        // a DOMException on abort, a TypeError on network failure, or a plain object. Reading
        // name/message structurally is a safe superset that doesn't depend on any one prototype
        // chain, rather than asserting `instanceof Error`.
        const hasNameAndMessage =
          typeof error === 'object' && error !== null && 'name' in error && 'message' in error;
        logger.warn('alert webhook failed', {
          url,
          source: payload.source,
          event: payload.event,
          errorName: hasNameAndMessage
            ? String((error as { name: unknown }).name)
            : 'UnknownError',
          errorMessage: hasNameAndMessage
            ? String((error as { message: unknown }).message)
            : String(error),
        });
      })
      .finally(() => clearTimeout(timeoutId));
  } catch (error) {
    clearTimeout(timeoutId);
    const hasNameAndMessage =
      typeof error === 'object' && error !== null && 'name' in error && 'message' in error;
    logger.warn('alert webhook failed', {
      url,
      source: payload.source,
      event: payload.event,
      errorName: hasNameAndMessage ? String((error as { name: unknown }).name) : 'UnknownError',
      errorMessage: hasNameAndMessage
        ? String((error as { message: unknown }).message)
        : String(error),
    });
  }
}
