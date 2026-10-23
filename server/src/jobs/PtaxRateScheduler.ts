/**
 * PtaxRateScheduler — BE-INCR-CRM-REPORT-BUILDER PR-1 (nó CRM-RB; BRIEF item 23). Clone mínimo de `DfePollScheduler`:
 * a cada tick roda `PtaxSyncService.syncClosings()`, que só chama o BCB se houver lacuna de dia útil. Falha do BCB vira
 * `warn` e nova tentativa no tick seguinte; nunca derruba o boot (o tick engole o erro, já logado em `runOnce`).
 * Mesmo desenho: lock process-local, sem timer sob NODE_ENV=test a menos que `allowInTest`.
 *
 * ⚠️ Lock PROCESS-LOCAL — mesma ressalva de `AccountingSyncScheduler` (não protege multi-réplica); duas réplicas gravando
 * a mesma cotação não duplicam (o `@@unique([currency, rateDate])` + upsert), só fazem uma chamada a mais ao BCB.
 */
import logger, { type EventLogger } from '../lib/logger';
import { sendAlertWebhook, type AlertPayload } from '../lib/alertWebhook';
import { getFactory } from '../lib/factory';
import type { PtaxSyncSummary } from '../features/fx/services/PtaxSyncService';

const JOB = 'ptax_rate_sync';
const DEFAULT_INTERVAL_MS = 1_800_000; // 30 minutos — sem lacuna o tick não chama o BCB
const DEFAULT_INITIAL_DELAY_MS = 30_000;

/** Gate P4 (ADR-OBSERVABILIDADE OBS-R9): every scheduler line carries a `job.*` catalog event. */
type JobLogger = EventLogger;

export interface PtaxRateSchedulerDeps {
  sync?: () => Promise<PtaxSyncSummary>;
  log?: JobLogger;
  /** Nó OBS, item 10 (F-OBS-7 a): remote alert on failure. Default = the fire-and-forget webhook. */
  alert?: (payload: AlertPayload) => void;
}

export interface PtaxRateSchedulerStartOptions {
  intervalMs?: number;
  initialDelayMs?: number;
  allowInTest?: boolean;
}

function readMsEnv(name: string, fallback: number, min: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min) throw new Error(`Invalid ${name}='${raw}' — must be an integer >= ${min} (ms).`);
  return n;
}

export class PtaxRateScheduler {
  private running = false;
  private initialTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly sync: () => Promise<PtaxSyncSummary>;
  private readonly log: JobLogger;
  private readonly alert: (payload: AlertPayload) => void;

  constructor(deps: PtaxRateSchedulerDeps = {}) {
    this.sync = deps.sync ?? (() => getFactory().getPtaxSyncService().syncClosings());
    this.log = deps.log ?? logger;
    this.alert = deps.alert ?? sendAlertWebhook;
  }

  async runOnce(): Promise<PtaxSyncSummary | { skipped: 'lock' }> {
    if (this.running) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'skipped_due_to_lock' });
      return { skipped: 'lock' };
    }
    this.running = true;
    try {
      const summary = await this.sync();
      if (summary.failed > 0) this.log.event('warn', 'job.completed', JOB, { job: JOB, ...summary });
      else this.log.event('info', 'job.completed', JOB, { job: JOB, ...summary });
      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.event('error', 'job.failed', JOB, { job: JOB, error: message });
      this.alert({ source: 'ptax_rate', event: 'job_failed', timestamp: new Date().toISOString(), job: JOB, error: message });
      throw error;
    } finally {
      this.running = false;
    }
  }

  start(options: PtaxRateSchedulerStartOptions = {}): void {
    if (process.env.NODE_ENV === 'test' && !options.allowInTest) {
      this.log.event('info', 'job.skipped', JOB, { job: JOB, reason: 'disabled_in_test' });
      return;
    }
    if (this.initialTimer || this.intervalTimer) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'already_started' });
      return;
    }
    const intervalMs = options.intervalMs ?? readMsEnv('PTAX_SYNC_INTERVAL_MS', DEFAULT_INTERVAL_MS, 1);
    const initialDelayMs = options.initialDelayMs ?? readMsEnv('PTAX_SYNC_INITIAL_DELAY_MS', DEFAULT_INITIAL_DELAY_MS, 0);

    const tick = (): void => {
      void this.runOnce().catch(() => {
        /* já logado em runOnce (job.failed) */
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

export const ptaxRateScheduler = new PtaxRateScheduler();
