/**
 * DataExchangeStaleSweepScheduler — EFX F-18.2 (SM Q-07 = a, dono, questionário 2026-11-10). Uma queda entre o
 * `createJob` (PROCESSING) e a tx do EXPORTED deixava o `AccountingDataExchangeJob` PROCESSING para sempre, e o
 * arquivo podia existir sem a linha EXPORTED. A cada ciclo, o job PROCESSING sem desfecho há mais de
 * `DATA_EXCHANGE_PROCESSING_STALE_MS` vira FAILED (`DataExchangeExportService.failStaleProcessing`). O motivo vai no
 * log e no alerta (`reason: 'stale_processing'`): o job não tem coluna de motivo, e os outros caminhos de FAILED do
 * export também só alertam. Molde de `VecOrphanSweepScheduler`: lock process-local, sem timer sob NODE_ENV=test a
 * menos que `allowInTest`, falha → `job.failed` + alerta remoto (F-OBS-7 a) e o tick seguinte tenta de novo.
 */
import logger, { type EventLogger } from '../lib/logger';
import { sendAlertWebhook, type AlertPayload } from '../lib/alertWebhook';
import { getFactory } from '../lib/factory';
import type { StaleFailedJob } from '../features/accounting/models/DataExchange.model';

const JOB = 'data_exchange_stale_sweep';
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_INITIAL_DELAY_MS = 90_000;

export interface DataExchangeStaleSweepSchedulerDeps {
  sweep?: () => Promise<StaleFailedJob[]>;
  log?: EventLogger;
  alert?: (payload: AlertPayload) => void;
}

export interface DataExchangeStaleSweepSchedulerStartOptions {
  intervalMs?: number;
  initialDelayMs?: number;
  allowInTest?: boolean;
}

export class DataExchangeStaleSweepScheduler {
  private running = false;
  private initialTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly sweep: () => Promise<StaleFailedJob[]>;
  private readonly log: EventLogger;
  private readonly alert: (payload: AlertPayload) => void;

  constructor(deps: DataExchangeStaleSweepSchedulerDeps = {}) {
    this.sweep = deps.sweep ?? (() => getFactory().getDataExchangeExportService().failStaleProcessing());
    this.log = deps.log ?? logger;
    this.alert = deps.alert ?? sendAlertWebhook;
  }

  async runOnce(): Promise<{ failed: number } | { skipped: 'lock' }> {
    if (this.running) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'skipped_due_to_lock' });
      return { skipped: 'lock' };
    }
    this.running = true;
    try {
      const failed = await this.sweep();
      for (const j of failed) {
        // Mesma fonte e evento dos outros FAILED do export (DataExchangeExportService/SPED), com o motivo.
        this.alert({
          source: 'data_exchange_export', event: 'generation_failed', timestamp: new Date().toISOString(),
          jobId: j.id, kind: j.kind, unitId: j.unitId, reason: 'stale_processing',
        });
      }
      const summary = { failed: failed.length };
      if (failed.length > 0) {
        this.log.event('warn', 'job.completed', JOB, { job: JOB, ...summary, reason: 'stale_processing', jobIds: failed.map((j) => j.id) });
      } else {
        this.log.event('info', 'job.completed', JOB, { job: JOB, ...summary });
      }
      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.event('error', 'job.failed', JOB, { job: JOB, error: message });
      this.alert({ source: 'data_exchange_stale_sweep', event: 'job_failed', timestamp: new Date().toISOString(), job: JOB, error: message });
      throw error;
    } finally {
      this.running = false;
    }
  }

  start(options: DataExchangeStaleSweepSchedulerStartOptions = {}): void {
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
      // eslint-disable-next-line no-restricted-syntax -- SANCTIONED: já registrado e alertado em runOnce (job.failed); o timer não pode morrer (OBS-R8)
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

export const dataExchangeStaleSweepScheduler = new DataExchangeStaleSweepScheduler();
