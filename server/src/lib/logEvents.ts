import { z } from 'zod';

/**
 * Closed catalog of log events (ADR-OBSERVABILIDADE §4, F-OBS-10 a / F-OBS-11 a). Only the lines of the
 * 6 gates carry `event` (OBS-R9): HTTP, API error, auth, process, jobs, outbound integration — plus the
 * alert sink. Any other line goes through `logger.<level>` without one. A new gate event enters here, in
 * the same change that emits it.
 *
 * `AlertPayload.event` (alertWebhook.ts) is a separate vocabulary on purpose: it is the webhook's contract
 * with whoever receives it, and renaming it would break that consumer.
 */
export const LOG_EVENTS = [
  // P1 HTTP
  'http.request',
  // P2 API error
  'api.error',
  // auth (P1/P2)
  'auth.denied',
  // P3 process
  'process.unhandled_rejection', 'process.uncaught_exception', 'process.started',
  // P4 jobs
  'job.started', 'job.completed', 'job.skipped', 'job.failed',
  'job.reconcile_summary', 'job.reconcile_item_failed', 'job.scheduled',
  // P5 integration
  'integration.call', 'integration.failed',
  // alert
  'alert.failed',
] as const;

export type LogEvent = (typeof LOG_EVENTS)[number];

/**
 * The fixed shape of every server log line (OBS-R12). Top-level keys written by the logger itself and by
 * the request context are typed; the caller's context rides along untyped (already redacted). A new
 * top-level field enters here in the same change that introduces it.
 */
export const LogEntrySchema = z
  .object({
    timestamp: z.string().datetime(),
    level: z.enum(['debug', 'info', 'warn', 'error']),
    message: z.string().min(1),
    event: z.enum(LOG_EVENTS).optional(), // required only on gate lines (OBS-R9)
    requestId: z.string().optional(),
    userId: z.string().optional(),
    method: z.string().optional(),
    route: z.string().optional(),
    job: z.string().optional(),
  })
  .passthrough();

export type LogEntry = z.infer<typeof LogEntrySchema>;
