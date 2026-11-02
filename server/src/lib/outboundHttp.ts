import { logger } from './logger';

/** The integrations that call out over `fetch` (ADR-OBSERVABILIDADE A4). A new one enters here with its call site. */
export type OutboundIntegration = 'mercado_pago' | 'bcb_ptax' | 'qdrant' | 'psc' | 'sefaz';

/**
 * Gate P5 (ADR-OBSERVABILIDADE OBS-R10, F-OBS-16 a): every outbound `fetch` goes through here and leaves one line.
 *
 * - a response → `integration.call` with integration, method, status and `durationMs` (time to headers: the caller
 *   reads the body afterwards); `info` on 2xx, `warn` otherwise ("response out of the expected", OBS-R4);
 * - a rejection (network, timeout/abort) → `integration.failed` at `warn`, and the error is rethrown untouched.
 *
 * Levels ratified by the owner as a spec gap of item 5 (chat, 2026-10-23): the wrapper makes one attempt and the
 * caller decides what a failure means, so the defect line is the caller's (`job.failed`, `api.error`) — a Qdrant
 * outage seen by every `/health` must not fill the error file with one `error` per call.
 *
 * Never logged: the URL (it can carry a credential or a query), headers, request or response body (OBS-R7).
 * `alertWebhook.ts` stays on bare `fetch`: logging the alert sink through itself would loop.
 */
export async function outboundFetch(
  integration: OutboundIntegration,
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const startedAt = Date.now();
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (error) {
    logger.event('warn', 'integration.failed', 'outbound call failed', {
      integration,
      method,
      durationMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    throw error;
  }
  logger.event(res.ok ? 'info' : 'warn', 'integration.call', 'outbound call', {
    integration,
    method,
    status: res.status,
    durationMs: Date.now() - startedAt,
  });
  return res;
}
