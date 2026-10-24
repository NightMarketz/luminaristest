/**
 * AccountingSyncScheduler — periodic, non-overlapping driver for the AccountingSync
 * reconciliation job (Incremento B.1). It does NOT reimplement reconciliation logic:
 * it wraps the existing `runAccountingSyncReconcile()` (JOB-005 — Prisma-direct job)
 * with scheduling, a process-local concurrency lock, and structured observability.
 *
 * ⚠️ The lock is PROCESS-LOCAL: it prevents overlap within ONE Node process only.
 * It does NOT protect against multiple replicas. Before production:
 *   - confirm single-process deployment, OR
 *   - use an external scheduler with concurrency=1, OR
 *   - open an ADR for a distributed lease.
 * See docs/runbooks/accounting-sync-reconciliation.md.
 * ponytail: process-local lock; upgrade to a DB/advisory lease only if multi-replica.
 */
import { randomUUID } from 'crypto';
import logger, { type EventLogger } from '../lib/logger';
import { sendAlertWebhook, type AlertPayload } from '../lib/alertWebhook';
import { runAccountingSyncReconcile } from './accountingSyncReconcile.job';
import type { ReconcileSummary } from './accountingSyncReconcile.job';

const JOB = 'accounting_sync_reconcile';
const DEFAULT_INTERVAL_MS = 300_000; // 5 minutes
const DEFAULT_INITIAL_DELAY_MS = 60_000; // 1 minute (mirrors the purge job)

/** Gate P4 (ADR-OBSERVABILIDADE OBS-R9): every scheduler line carries a `job.*` catalog event. */
type JobLogger = EventLogger;

export interface SchedulerDeps {
  /** The reconciliation entry point. Defaults to runAccountingSyncReconcile. */
  reconcile?: () => Promise<ReconcileSummary>;
  log?: JobLogger;
  /** Injectable for deterministic tests; defaults to a random UUID per run. */
  genRunId?: () => string;
  /** Injectable clock (ms) for deterministic duration/timestamps in tests. */
  now?: () => number;
  /**
   * Remote alert (OBS-R11; ADR-OBSERVABILIDADE A9 / item 7b): the bad-summary alert AND the failure of the pass.
   * Default = the fire-and-forget webhook.
   */
  alert?: (payload: AlertPayload) => void;
}

export interface SchedulerStartOptions {
  intervalMs?: number;
  initialDelayMs?: number;
  /** Escape hatch so unit tests can exercise the timer path under NODE_ENV=test. */
  allowInTest?: boolean;
}

export type RunOnceResult = ReconcileSummary | { skipped: 'lock' };

/** Reads a positive-integer ms env var, or throws if present-but-invalid. */
function readMsEnv(name: string, fallback: number, min: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min) {
    throw new Error(`Invalid ${name}='${raw}' — must be an integer >= ${min} (ms).`);
  }
  return n;
}

function assertMs(value: number, label: string, min: number): void {
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`Invalid ${label}=${value} — must be an integer >= ${min} (ms).`);
  }
}

export class AccountingSyncScheduler {
  private running = false;
  private initialTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;

  private readonly reconcile: () => Promise<ReconcileSummary>;
  private readonly log: JobLogger;
  private readonly genRunId: () => string;
  private readonly now: () => number;
  private readonly alert: (payload: AlertPayload) => void;

  constructor(deps: SchedulerDeps = {}) {
    this.reconcile = deps.reconcile ?? runAccountingSyncReconcile;
    this.log = deps.log ?? logger;
    this.genRunId = deps.genRunId ?? (() => randomUUID());
    this.now = deps.now ?? (() => Date.now());
    this.alert = deps.alert ?? sendAlertWebhook;
  }

  /**
   * One guarded reconciliation pass. If a pass is already running in THIS process,
   * the call is skipped (process-local lock). The lock is released in `finally`,
   * so an exception never leaves the scheduler permanently stuck.
   */
  async runOnce(): Promise<RunOnceResult> {
    if (this.running) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'skipped_due_to_lock' });
      return { skipped: 'lock' };
    }
    this.running = true;
    const runId = this.genRunId();
    const startedAtMs = this.now();
    const startedAt = new Date(startedAtMs).toISOString();
    this.log.event('info', 'job.started', JOB, { job: JOB, runId, startedAt });

    try {
      const summary = await this.reconcile();
      const blocked = summary.blocked ?? 0;
      const pendingWriteFailed = summary.pendingWriteFailed ?? 0;
      const completeContext = {
        job: JOB,
        runId,
        startedAt,
        durationMs: this.now() - startedAtMs,
        total: summary.total,
        synced: summary.synced,
        idempotentHits: summary.idempotentHits,
        failed: summary.failed,
        blocked,
        pendingWriteFailed,
      };
      // logger.ts only persists error|warn to the NDJSON sink (info is console-only) — a
      // blocked or failed run must log at `warn` or the summary is invisible on disk.
      // pendingWriteFailed > 0 also warns: it is the one case where an item ends up with NO
      // trace anywhere (watermark held by Fork 5-b, but nobody is told the safety net itself failed).
      if (blocked > 0 || summary.failed > 0 || pendingWriteFailed > 0) {
        this.log.event('warn', 'job.completed', JOB, completeContext);
        // Fire-and-forget — never awaited, never throws (see alertWebhook.ts). No-op when
        // ALERT_WEBHOOK_URL is unset.
        this.alert({
          ...completeContext,
          source: 'accounting_sync_reconcile',
          event: 'reconcile_summary',
          timestamp: new Date(this.now()).toISOString(),
        });
      } else {
        this.log.event('info', 'job.completed', JOB, completeContext);
      }
      return summary;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log.event('error', 'job.failed', JOB, {
        job: JOB,
        runId,
        startedAt,
        durationMs: this.now() - startedAtMs,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage,
      });
      // A9 / item 7b: a pass that throws is the failure most worth alerting — until this it only reached the log.
      this.alert({
        source: 'accounting_sync_reconcile',
        event: 'job_failed',
        timestamp: new Date(this.now()).toISOString(),
        job: JOB,
        runId,
        error: errorMessage,
      });
      throw error;
    } finally {
      this.running = false;
    }
  }

  /**
   * Schedule periodic runs: first after `initialDelayMs`, then every `intervalMs`.
   * No-op under NODE_ENV=test unless `allowInTest` is set. Throws on invalid config.
   */
  start(options: SchedulerStartOptions = {}): void {
    if (process.env.NODE_ENV === 'test' && !options.allowInTest) {
      this.log.event('info', 'job.skipped', JOB, { job: JOB, reason: 'disabled_in_test' });
      return;
    }
    if (this.initialTimer || this.intervalTimer) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'already_started' });
      return;
    }

    let intervalMs: number;
    let initialDelayMs: number;
    if (options.intervalMs !== undefined) {
      assertMs(options.intervalMs, 'intervalMs', 1);
      intervalMs = options.intervalMs;
    } else {
      intervalMs = readMsEnv('ACCOUNTING_SYNC_RECONCILE_INTERVAL_MS', DEFAULT_INTERVAL_MS, 1);
    }
    if (options.initialDelayMs !== undefined) {
      assertMs(options.initialDelayMs, 'initialDelayMs', 0);
      initialDelayMs = options.initialDelayMs;
    } else {
      initialDelayMs = readMsEnv('ACCOUNTING_SYNC_RECONCILE_INITIAL_DELAY_MS', DEFAULT_INITIAL_DELAY_MS, 0);
    }

    // The interval callback swallows errors (runOnce already logged them) so a single
    // failing pass never tears the recurring scheduler down.
    const tick = (): void => {
      // eslint-disable-next-line no-restricted-syntax -- SANCTIONED: já registrado e alertado em runOnce (job.failed); o timer não pode morrer (OBS-R8)
      void this.runOnce().catch(() => {
        /* already logged in runOnce (job.failed) */
      });
    };

    this.initialTimer = setTimeout(() => {
      tick();
      this.intervalTimer = setInterval(tick, intervalMs);
      this.intervalTimer.unref?.();
    }, initialDelayMs);
    this.initialTimer.unref?.();

    this.log.event('info', 'job.scheduled', JOB, { job: JOB, intervalMs, initialDelayMs });
  }

  /** Stop all timers. Safe to call when not started; called from graceful shutdown. */
  stop(): void {
    if (this.initialTimer) {
      clearTimeout(this.initialTimer);
      this.initialTimer = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }
}

/** Shared singleton wired into the server lifecycle (server.ts). */
export const accountingSyncScheduler = new AccountingSyncScheduler();
