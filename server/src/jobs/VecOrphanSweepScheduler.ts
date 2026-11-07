/**
 * VecOrphanSweepScheduler — BE-INCR-RAG-DOCUMENTOS RAG-PR-A item 9, caminho (2). Uma vez por dia apaga da `vec0`
 * (arquivo próprio, fora da transação do Prisma) as linhas sem `Chunk`: o resto de uma exclusão cujo SQL falhou depois
 * do vetor. Molde de `PtaxRateScheduler`: lock process-local, sem timer sob NODE_ENV=test a menos que `allowInTest`,
 * falha → `job.failed` + alerta remoto (F-OBS-7 a) e o tick seguinte tenta de novo.
 */
import logger, { type EventLogger } from '../lib/logger';
import { sendAlertWebhook, type AlertPayload } from '../lib/alertWebhook';
import { getFactory } from '../lib/factory';
import { VecOrphanSweepService, type VecOrphanSweepSummary } from '../features/documents/services/VecOrphanSweepService';

const JOB = 'vec_orphan_sweep';
const DEFAULT_INTERVAL_MS = 86_400_000; // diário
const DEFAULT_INITIAL_DELAY_MS = 120_000;

type JobLogger = EventLogger;

export interface VecOrphanSweepSchedulerDeps {
  sweep?: () => Promise<VecOrphanSweepSummary>;
  log?: JobLogger;
  alert?: (payload: AlertPayload) => void;
}

export interface VecOrphanSweepSchedulerStartOptions {
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

function defaultSweep(): Promise<VecOrphanSweepSummary> {
  const f = getFactory();
  return new VecOrphanSweepService(f.getChunkVectorRepository(), f.getChunkRepository()).sweep();
}

export class VecOrphanSweepScheduler {
  private running = false;
  private initialTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly sweep: () => Promise<VecOrphanSweepSummary>;
  private readonly log: JobLogger;
  private readonly alert: (payload: AlertPayload) => void;

  constructor(deps: VecOrphanSweepSchedulerDeps = {}) {
    this.sweep = deps.sweep ?? defaultSweep;
    this.log = deps.log ?? logger;
    this.alert = deps.alert ?? sendAlertWebhook;
  }

  async runOnce(): Promise<VecOrphanSweepSummary | { skipped: 'lock' }> {
    if (this.running) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'skipped_due_to_lock' });
      return { skipped: 'lock' };
    }
    this.running = true;
    try {
      const summary = await this.sweep();
      // Órfão achado = uma exclusão deixou vetor para trás (SQL falhou depois do vetor): warn, para aparecer.
      if (summary.deleted > 0) this.log.event('warn', 'job.completed', JOB, { job: JOB, ...summary });
      else this.log.event('info', 'job.completed', JOB, { job: JOB, ...summary });
      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.event('error', 'job.failed', JOB, { job: JOB, error: message });
      this.alert({ source: 'vec_orphan_sweep', event: 'job_failed', timestamp: new Date().toISOString(), job: JOB, error: message });
      throw error;
    } finally {
      this.running = false;
    }
  }

  start(options: VecOrphanSweepSchedulerStartOptions = {}): void {
    if (process.env.NODE_ENV === 'test' && !options.allowInTest) {
      this.log.event('info', 'job.skipped', JOB, { job: JOB, reason: 'disabled_in_test' });
      return;
    }
    if (this.initialTimer || this.intervalTimer) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'already_started' });
      return;
    }
    const intervalMs = options.intervalMs ?? readMsEnv('VEC_ORPHAN_SWEEP_INTERVAL_MS', DEFAULT_INTERVAL_MS, 1);
    const initialDelayMs = options.initialDelayMs ?? readMsEnv('VEC_ORPHAN_SWEEP_INITIAL_DELAY_MS', DEFAULT_INITIAL_DELAY_MS, 0);

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

export const vecOrphanSweepScheduler = new VecOrphanSweepScheduler();
