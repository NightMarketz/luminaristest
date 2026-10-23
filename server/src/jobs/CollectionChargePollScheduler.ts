/**
 * CollectionChargePollScheduler — BE-INCR-PAYMENT-PROVIDER PR-2 (nó F5, P2-9). Clone MÍNIMO do `DfePollScheduler`
 * (S15 do BRIEF): a cada 15 min re-consulta as cobranças PENDING (inclusive vencidas) e reenvia as CREATING com mais de
 * 10 min (P2-3, F3 a). Cobre webhook perdido. Sem timer sob NODE_ENV=test a menos que `allowInTest`.
 *
 * ⚠️ Lock PROCESS-LOCAL — mesma ressalva do DfePollScheduler (não protege multi-réplica).
 * ponytail: lock local; teto = 1 réplica (SQLite single-host); upgrade a lease distribuída só se multi-réplica.
 */
import logger, { type EventLogger } from '../lib/logger';
import { sendAlertWebhook, type AlertPayload } from '../lib/alertWebhook';
import { getFactory } from '../lib/factory';
import type { CollectionPollSummary } from '../features/accounting/services/CollectionChargeService';

const JOB = 'collection_charge_poll';
const DEFAULT_INTERVAL_MS = 15 * 60 * 1000; // P2-9: a cada 15 min
const DEFAULT_INITIAL_DELAY_MS = 60_000;

/** Gate P4 (ADR-OBSERVABILIDADE OBS-R9): every scheduler line carries a `job.*` catalog event. */
type JobLogger = EventLogger;

export interface CollectionChargePollSchedulerDeps {
  poll?: () => Promise<CollectionPollSummary>;
  log?: JobLogger;
  /** Nó OBS, item 10 (F-OBS-7 a): remote alert on failure. Default = the fire-and-forget webhook. */
  alert?: (payload: AlertPayload) => void;
}

export class CollectionChargePollScheduler {
  private running = false;
  private initialTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly poll: () => Promise<CollectionPollSummary>;
  private readonly log: JobLogger;
  private readonly alert: (payload: AlertPayload) => void;

  constructor(deps: CollectionChargePollSchedulerDeps = {}) {
    this.poll = deps.poll ?? (() => getFactory().getCollectionChargeService().pollPending());
    this.log = deps.log ?? logger;
    this.alert = deps.alert ?? sendAlertWebhook;
  }

  async runOnce(): Promise<CollectionPollSummary | { skipped: 'lock' }> {
    if (this.running) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'skipped_due_to_lock' });
      return { skipped: 'lock' };
    }
    this.running = true;
    try {
      const summary = await this.poll();
      if (summary.failed > 0) this.log.event('warn', 'job.completed', JOB, { job: JOB, ...summary });
      else this.log.event('info', 'job.completed', JOB, { job: JOB, ...summary });
      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.event('error', 'job.failed', JOB, { job: JOB, error: message });
      this.alert({ source: 'collection_charge_poll', event: 'job_failed', timestamp: new Date().toISOString(), job: JOB, error: message });
      throw error;
    } finally {
      this.running = false;
    }
  }

  start(options: { intervalMs?: number; initialDelayMs?: number; allowInTest?: boolean } = {}): void {
    if (process.env.NODE_ENV === 'test' && !options.allowInTest) {
      this.log.event('info', 'job.skipped', JOB, { job: JOB, reason: 'disabled_in_test' });
      return;
    }
    if (this.initialTimer || this.intervalTimer) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'already_started' });
      return;
    }
    const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    const initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
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

export const collectionChargePollScheduler = new CollectionChargePollScheduler();
