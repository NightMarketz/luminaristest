/**
 * DfePollScheduler — BE-INCR-DFE (nó X10b, BRIEF item 27). Clone MÍNIMO de
 * `AccountingSyncScheduler` (decisão D1 do implementador — "parametrizar o scheduler existente ou
 * clone mínimo": genericizar o scheduler existente tocaria um job estável e não relacionado por
 * um benefício nulo neste porte). Mesmo desenho: lock process-local, sem timer sob NODE_ENV=test
 * a menos que `allowInTest`.
 *
 * ⚠️ Lock PROCESS-LOCAL — mesma ressalva de `AccountingSyncScheduler` (não protege multi-réplica).
 * ponytail: lock local; upgrade a lease distribuída só se multi-réplica.
 */
import logger from '../lib/logger';
import { runDfePollPending } from './dfePollPending.job';
import type { PollSummary } from '../features/accounting/services/FiscalDocumentLifecycleService';

const JOB = 'dfe_poll_pending';
const DEFAULT_INTERVAL_MS = 120_000; // 2 minutos
const DEFAULT_INITIAL_DELAY_MS = 30_000;

interface JobLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface DfePollSchedulerDeps {
  poll?: () => Promise<PollSummary>;
  log?: JobLogger;
}

export interface DfePollSchedulerStartOptions {
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

export class DfePollScheduler {
  private running = false;
  private initialTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly poll: () => Promise<PollSummary>;
  private readonly log: JobLogger;

  constructor(deps: DfePollSchedulerDeps = {}) {
    this.poll = deps.poll ?? runDfePollPending;
    this.log = deps.log ?? logger;
  }

  async runOnce(): Promise<PollSummary | { skipped: 'lock' }> {
    if (this.running) {
      this.log.warn(JOB, { job: JOB, event: 'skipped', reason: 'skipped_due_to_lock' });
      return { skipped: 'lock' };
    }
    this.running = true;
    try {
      const summary = await this.poll();
      if (summary.failed > 0) {
        this.log.warn(JOB, { job: JOB, event: 'complete', ...summary });
      } else {
        this.log.info(JOB, { job: JOB, event: 'complete', ...summary });
      }
      return summary;
    } catch (error) {
      this.log.error(JOB, { job: JOB, event: 'failed', error: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      this.running = false;
    }
  }

  start(options: DfePollSchedulerStartOptions = {}): void {
    if (process.env.NODE_ENV === 'test' && !options.allowInTest) {
      this.log.info(JOB, { job: JOB, event: 'skipped', reason: 'disabled_in_test' });
      return;
    }
    if (this.initialTimer || this.intervalTimer) {
      this.log.warn(JOB, { job: JOB, event: 'skipped', reason: 'already_started' });
      return;
    }
    const intervalMs = options.intervalMs ?? readMsEnv('DFE_POLL_INTERVAL_MS', DEFAULT_INTERVAL_MS, 1);
    const initialDelayMs = options.initialDelayMs ?? readMsEnv('DFE_POLL_INITIAL_DELAY_MS', DEFAULT_INITIAL_DELAY_MS, 0);

    const tick = (): void => {
      void this.runOnce().catch(() => {
        /* já logado em runOnce(event:'failed') */
      });
    };
    this.initialTimer = setTimeout(() => {
      tick();
      this.intervalTimer = setInterval(tick, intervalMs);
      this.intervalTimer.unref?.();
    }, initialDelayMs);
    this.initialTimer.unref?.();
    this.log.info(JOB, { job: JOB, event: 'scheduled', intervalMs, initialDelayMs });
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

export const dfePollScheduler = new DfePollScheduler();
