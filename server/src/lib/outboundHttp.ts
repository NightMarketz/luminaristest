import { logger } from './logger';

/** The integrations that call out over `fetch` (ADR-OBSERVABILIDADE A4). A new one enters here with its call site. */
export type OutboundIntegration = 'mercado_pago' | 'bcb_ptax' | 'psc' | 'sefaz';

/**
 * Gate P5 (ADR-OBSERVABILIDADE OBS-R10, F-OBS-16 a): every outbound `fetch` goes through here and leaves one line.
 *
 * - a response → `integration.call` with integration, method, status and `durationMs` (time to headers: the caller
 *   reads the body afterwards); `info` on 2xx, `warn` otherwise ("response out of the expected", OBS-R4);
 * - a rejection (network, timeout/abort) → `integration.failed` at `warn`, and the error is rethrown untouched.
 *
 * Levels ratified by the owner as a spec gap of item 5 (chat, 2026-10-23): the wrapper makes one attempt and the
 * caller decides what a failure means, so the defect line is the caller's (`job.failed`, `api.error`) — an integration
 * outage seen by every caller must not fill the error file with one `error` per call.
 *
 * Onda 4 / 4.2 (auditoria 24/11/2026): the wrapper now owns timeout and retry.
 * - timeout: every attempt gets its own `AbortSignal.timeout` (per-integration default, `options.timeoutMs` overrides),
 *   unless the caller already passed `init.signal` — then that signal governs and is never overridden;
 * - retry: ONLY an idempotent call (GET/HEAD, or one carrying `X-Idempotency-Key`/`Idempotency-Key`) and ONLY on a
 *   transient failure (network error, timeout, 5xx, 429), with exponential backoff + jitter, capped. A POST without
 *   an idempotency key is never retried: resending blind would duplicate the effect. A caller abort is never retried.
 *   Each attempt leaves its own `integration.call`/`integration.failed` line; the last response/error is the caller's.
 *
 * - deadline (`options.deadlineMs`, opt-in): the TOTAL budget of the call, retries and backoff included. Each attempt's
 *   timeout is capped at what is left of it, and a retry whose backoff would not fit in what is left is not made — the
 *   last response/error is returned/thrown at once. Without it the worst case is `maxAttempts × timeoutMs + backoff`
 *   (e.g. 3 × 60 s). A caller `init.signal` still governs and is combined with the deadline, never replaced.
 *
 * Never logged: the URL (it can carry a credential or a query), headers, request or response body (OBS-R7).
 * `alertWebhook.ts` stays on bare `fetch`: logging the alert sink through itself would loop.
 */
export interface OutboundRetryPolicy {
  /** Tentativas totais (a 1ª inclusa). Padrão 3. */
  maxAttempts?: number;
  /** Espera base do backoff exponencial, em ms. Padrão 250. */
  baseDelayMs?: number;
  /** Teto de uma espera, em ms (também limita o `Retry-After`). Padrão 4000. */
  maxDelayMs?: number;
}

export interface OutboundOptions {
  /** Timeout de CADA tentativa. Padrão por integração (`DEFAULT_TIMEOUT_MS`); ignorado se `init.signal` já veio. */
  timeoutMs?: number;
  /** `false` desliga o retry; objeto ajusta a política. Só chamada idempotente é re-tentada de qualquer jeito. */
  retry?: false | OutboundRetryPolicy;
  /**
   * Prazo TOTAL da chamada em ms (todas as tentativas e esperas). Opt-in: ausente = só o timeout por tentativa vale. Cada
   * tentativa recebe no máximo o que resta; retry que não cabe no que resta não é feito (devolve a última resposta/erro).
   */
  deadlineMs?: number;
}

/** Timeout padrão por tentativa (ms) — configurável por integração; o chamador sobrescreve com `options.timeoutMs`. */
export const DEFAULT_TIMEOUT_MS: Record<OutboundIntegration, number> = {
  mercado_pago: 15_000,
  bcb_ptax: 15_000,
  psc: 30_000,
  sefaz: 30_000,
};

/** Política de rede de UM ponto de chamada: o que o chamador passa ao `outboundFetch` além da URL. */
export type OutboundPolicy = Pick<OutboundOptions, 'timeoutMs' | 'retry' | 'deadlineMs'>;

/**
 * Política por ponto de chamada (dono, chat, 2026-11-24 — tabela §6 da proposta de `deadlineMs` por integração; lacunas
 * 1f43/9f14). Cada ponto com retry vem como PAR `{maxAttempts, deadlineMs}`: `maxAttempts: 2` e `deadlineMs = 2 × timeout
 * + 5 s` (5 s = `Retry-After` capado em 4 s + 1 s), de modo que o prazo é só o teto de segurança e nunca corta uma
 * tentativa no meio — com `maxAttempts: 3` o wrapper faria uma 3ª tentativa truncada (lacuna 83be). Ponto de 1 tentativa:
 * o timeout já é o teto, sem deadline. O mesmo `getCharge` tem política diferente no webhook (o MP espera 22 s) e no job.
 * PROVISÓRIAS até haver medida (proposta §7): os prazos de criar/cancelar ordem do MP (`MP_ORDER_DEADLINE_MS`) e o da
 * SEFAZ — mude só aqui.
 */
const RETRY_ONCE: OutboundRetryPolicy = { maxAttempts: 2 };
/** SEFAZ SOAP: prazo TOTAL de cada chamada (conexão + resposta), no `SefazSoapClient` (não usa `outboundFetch`). PROVISÓRIO
 *  (linha 11 da tabela): sem SLA oficial nem medida por UF — curto ⇒ contingência AUTO cedo + órfã; longo ⇒ balcão preso. */
export const SEFAZ_CALL_TOTAL_MS = 30_000;
export const MP_ORDER_DEADLINE_MS = 35_000; // 2 × 15 s + 5 s — provisório (linhas 1/2/4 da tabela)
export const MP_REPORT_DEADLINE_MS = 125_000; // 2 × 60 s + 5 s
export const BCB_PTAX_DEADLINE_MS = 25_000; // 2 × 10 s + 5 s
export const PSC_DISCOVERY_TIMEOUT_MS = 15_000; // total (1 prazo só): hoje o `signal` compartilhado já era isso
export const OUTBOUND_POLICY = {
  /** POST /v1/orders — re-tenta com a MESMA `X-Idempotency-Key`. */
  mpOrderCreate: { timeoutMs: 15_000, retry: RETRY_ONCE, deadlineMs: MP_ORDER_DEADLINE_MS },
  /** POST /v1/orders/{id}/cancel — o 409 do re-cancel já é tratado relendo a ordem. */
  mpOrderCancel: { timeoutMs: 15_000, retry: RETRY_ONCE, deadlineMs: MP_ORDER_DEADLINE_MS },
  /** GET da ordem dentro do handler do webhook: 1 tentativa (15 s + HMAC/DB < 22 s do MP); falha ⇒ o job reconcilia. */
  mpGetChargeWebhook: { timeoutMs: 15_000, retry: false },
  /** GET da ordem no job/recheck. */
  mpGetChargeJob: { timeoutMs: 15_000, retry: RETRY_ONCE, deadlineMs: MP_ORDER_DEADLINE_MS },
  /** GET list/download do relatório de liberações. */
  mpReportGet: { timeoutMs: 60_000, retry: RETRY_ONCE, deadlineMs: MP_REPORT_DEADLINE_MS },
  /** POST release_report: sem chave de idempotência o wrapper nunca re-tenta; o timeout já é o teto. */
  mpReportPost: { timeoutMs: 60_000 },
  /** GET da cotação PTAX. */
  bcbPtax: { timeoutMs: 10_000, retry: RETRY_ONCE, deadlineMs: BCB_PTAX_DEADLINE_MS },
  /** GET certificate-discovery do PSC: prazo explícito de 15 s no total, sem `signal` do chamador. */
  pscDiscovery: { timeoutMs: PSC_DISCOVERY_TIMEOUT_MS, deadlineMs: PSC_DISCOVERY_TIMEOUT_MS },
} as const satisfies Record<string, OutboundPolicy>;

const DEFAULT_RETRY = { maxAttempts: 3, baseDelayMs: 250, maxDelayMs: 4_000 } as const;
const IDEMPOTENCY_HEADERS = ['x-idempotency-key', 'idempotency-key'];

function isIdempotent(method: string, init?: RequestInit): boolean {
  if (method === 'GET' || method === 'HEAD') return true;
  const headers = new Headers(init?.headers);
  return IDEMPOTENCY_HEADERS.some((h) => (headers.get(h) ?? '').trim() !== '');
}

const isTransientStatus = (status: number): boolean => status === 429 || (status >= 500 && status <= 599);

function backoffMs(attempt: number, policy: Required<OutboundRetryPolicy>, retryAfter: string | null): number {
  const exp = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (attempt - 1));
  const jittered = Math.round(exp * (0.5 + Math.random() * 0.5));
  const seconds = retryAfter !== null ? Number(retryAfter) : NaN;
  const hinted = Number.isFinite(seconds) && seconds >= 0 ? Math.min(policy.maxDelayMs, seconds * 1000) : 0;
  return Math.max(jittered, hinted);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function outboundFetch(
  integration: OutboundIntegration,
  input: string,
  init?: RequestInit,
  options?: OutboundOptions,
): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const callerSignal = init?.signal ?? undefined;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS[integration];
  const policy: Required<OutboundRetryPolicy> | null =
    options?.retry === false || !isIdempotent(method, init) ? null : { ...DEFAULT_RETRY, ...options?.retry };
  const maxAttempts = policy?.maxAttempts ?? 1;
  const deadlineAt = options?.deadlineMs !== undefined && Number.isFinite(options.deadlineMs) && options.deadlineMs > 0 ? Date.now() + options.deadlineMs : null;
  const restante = (): number => (deadlineAt === null ? Number.POSITIVE_INFINITY : deadlineAt - Date.now());
  const naoCabe = (esperaMs: number): boolean => deadlineAt !== null && restante() <= esperaMs;
  const sinalDaTentativa = (): AbortSignal => {
    const doPrazo = deadlineAt === null ? null : AbortSignal.timeout(Math.max(1, restante()));
    if (callerSignal) return doPrazo ? AbortSignal.any([callerSignal, doPrazo]) : callerSignal;
    return AbortSignal.timeout(Math.max(1, Math.min(timeoutMs, restante())));
  };

  for (let attempt = 1; ; attempt += 1) {
    const startedAt = Date.now();
    const last = attempt >= maxAttempts;
    let res: Response;
    try {
      res = await fetch(input, { ...init, signal: sinalDaTentativa() });
    } catch (error) {
      logger.event('warn', 'integration.failed', 'outbound call failed', {
        integration,
        method,
        attempt,
        durationMs: Date.now() - startedAt,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      if (last || policy === null || callerSignal?.aborted) throw error;
      const espera = backoffMs(attempt, policy, null);
      if (naoCabe(espera)) throw error; // o prazo total não comporta outra tentativa
      await sleep(espera);
      continue;
    }
    logger.event(res.ok ? 'info' : 'warn', 'integration.call', 'outbound call', {
      integration,
      method,
      attempt,
      status: res.status,
      durationMs: Date.now() - startedAt,
    });
    if (last || policy === null || !isTransientStatus(res.status)) return res;
    const espera = backoffMs(attempt, policy, res.headers.get('retry-after'));
    if (naoCabe(espera)) return res; // o prazo total não comporta outra tentativa: o chamador decide sobre esta resposta
    try {
      await res.body?.cancel(); // libera o socket antes de re-tentar
    } catch (error) {
      logger.warn('outbound: não cancelou o corpo da resposta antes de re-tentar', { integration, error });
    }
    await sleep(espera);
  }
}
