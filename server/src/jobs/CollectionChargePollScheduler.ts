/**
 * CollectionChargePollScheduler — BE-INCR-PAYMENT-PROVIDER PR-2 (nó F5, P2-9). Clone MÍNIMO do `DfePollScheduler`
 * (S15 do BRIEF): a cada 15 min re-consulta as cobranças PENDING (inclusive vencidas) e reenvia as CREATING com mais de
 * 10 min (P2-3, F3 a). Cobre webhook perdido. Sem timer sob NODE_ENV=test a menos que `allowInTest`.
 *
 * ⚠️ Lock PROCESS-LOCAL — mesma ressalva do DfePollScheduler (não protege multi-réplica).
 * ponytail: lock local; teto = 1 réplica (SQLite single-host); upgrade a lease distribuída só se multi-réplica.
 */
import logger from '../lib/logger';
import { getFactory } from '../lib/factory';
import type { CollectionPollSummary } from '../features/accounting/services/CollectionChargeService';

const JOB = 'collection_charge_poll';
const DEFAULT_INTERVAL_MS = 15 * 60 * 1000; // P2-9: a cada 15 min
const DEFAULT_INITIAL_DELAY_MS = 60_000;

interface JobLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface CollectionChargePollSchedulerDeps {
  poll?: () => Promise<CollectionPollSummary>;
  log?: JobLogger;
}

export class CollectionChargePollScheduler {
  private running = false;
  private initialTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly poll: () => Promise<CollectionPollSummary>;
  private readonly log: JobLogger;

  constructor(deps: CollectionChargePollSchedulerDeps = {}) {
    this.poll = deps.poll ?? (() => getFactory().getCollectionChargeService().pollPending());
    this.log = deps.log ?? logger;
  }

  async runOnce(): Promise<CollectionPollSummary | { skipped: 'lock' }> {
    if (this.running) {
      this.log.warn(JOB, { job: JOB, event: 'skipped', reason: 'skipped_due_to_lock' });
      return { skipped: 'lock' };
    }
    this.running = true;
    try {
      const summary = await this.poll();
      if (summary.failed > 0) this.log.warn(JOB, { job: JOB, event: 'complete', ...summary });
      else this.log.info(JOB, { job: JOB, event: 'complete', ...summary });
      return summary;
    } catch (error) {
      this.log.error(JOB, { job: JOB, event: 'failed', error: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      this.running = false;
    }
  }

  start(options: { intervalMs?: number; initialDelayMs?: number; allowInTest?: boolean } = {}): void {
    if (process.env.NODE_ENV === 'test' && !options.allowInTest) {
      this.log.info(JOB, { job: JOB, event: 'skipped', reason: 'disabled_in_test' });
      return;
    }
    if (this.initialTimer || this.intervalTimer) {
      this.log.warn(JOB, { job: JOB, event: 'skipped', reason: 'already_started' });
      return;
    }
    const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    const initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
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

export const collectionChargePollScheduler = new CollectionChargePollScheduler();
