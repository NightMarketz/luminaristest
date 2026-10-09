/**
 * MpReleaseReportScheduler — BE-INCR-PAYMENT-PROVIDER PR-3 (nó F5, P3-5; F-PPB-6 a). Job DIÁRIO `mpReleaseReportFetch`:
 * por PaymentAccount MP ACTIVE, busca o relatório de liberações da faixa `[watermark, hoje 00:00 BRT)` e o importa
 * como extrato da conta (`ReleaseReportService.fetchAll`). Só importa — a baixa continua no confirm humano do F7
 * (resposta 20). Clone mínimo do `CollectionChargePollScheduler`; sem timer sob NODE_ENV=test a menos que `allowInTest`.
 *
 * ⚠️ Lock PROCESS-LOCAL — mesma ressalva do DfePollScheduler (não protege multi-réplica).
 * ponytail: lock local; teto = 1 réplica (SQLite single-host); upgrade a lease distribuída só se multi-réplica.
 */
import logger from '../lib/logger';
import { getFactory } from '../lib/factory';
import type { ReleaseReportFetchSummary } from '../features/accounting/services/ReleaseReportService';

const JOB = 'mp_release_report_fetch';
const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // P3-5: diário
const DEFAULT_INITIAL_DELAY_MS = 5 * 60_000;

interface JobLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface MpReleaseReportSchedulerDeps {
  fetch?: () => Promise<ReleaseReportFetchSummary>;
  log?: JobLogger;
}

export class MpReleaseReportScheduler {
  private running = false;
  private initialTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly fetch: () => Promise<ReleaseReportFetchSummary>;
  private readonly log: JobLogger;

  constructor(deps: MpReleaseReportSchedulerDeps = {}) {
    this.fetch = deps.fetch ?? (() => getFactory().getReleaseReportService().fetchAll());
    this.log = deps.log ?? logger;
  }

  async runOnce(): Promise<ReleaseReportFetchSummary | { skipped: 'lock' }> {
    if (this.running) {
      this.log.warn(JOB, { job: JOB, event: 'skipped', reason: 'skipped_due_to_lock' });
      return { skipped: 'lock' };
    }
    this.running = true;
    try {
      const summary = await this.fetch();
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

export const mpReleaseReportScheduler = new MpReleaseReportScheduler();
