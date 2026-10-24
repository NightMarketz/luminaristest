/**
 * LegalParamsRecalcScheduler — BE-INCR-LEGAL-PARAMS PR-4 (nó LEGAL-PARAMS; BRIEF §3 item 10; emenda §9 L-3: "Dispara na
 * publicação + varredura"). Clone mínimo de `DfePollScheduler`: varre `legal_parameter_recalc_jobs` PENDING no
 * intervalo e, além disso, `kick()` roda uma passada logo depois de publicar/revogar (fire-and-forget, fora da
 * requisição). Mesmo desenho: lock process-local, sem timer nem kick sob NODE_ENV=test a menos que `allowInTest`.
 *
 * ⚠️ Lock PROCESS-LOCAL — mesma ressalva de `AccountingSyncScheduler` (não protege multi-réplica).
 */
import logger, { type EventLogger } from '../lib/logger';
import { sendAlertWebhook, type AlertPayload } from '../lib/alertWebhook';
import { getFactory } from '../lib/factory';

const JOB = 'legal_params_recalc';
const DEFAULT_INTERVAL_MS = 300_000; // 5 minutos
const DEFAULT_INITIAL_DELAY_MS = 30_000;

type Resumo = Awaited<ReturnType<ReturnType<ReturnType<typeof getFactory>['getTaxAssessmentRecalcService']>['processarPendentes']>>;

/** Gate P4 (ADR-OBSERVABILIDADE OBS-R9): every scheduler line carries a `job.*` catalog event. */
type JobLogger = EventLogger;

export interface LegalParamsRecalcSchedulerDeps {
  run?: () => Promise<Resumo>;
  log?: JobLogger;
  /** Nó OBS, item 10 (F-OBS-7 a): remote alert on failure. Default = the fire-and-forget webhook. */
  alert?: (payload: AlertPayload) => void;
}

function readMsEnv(name: string, fallback: number, min: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min) throw new Error(`Invalid ${name}='${raw}' — must be an integer >= ${min} (ms).`);
  return n;
}

export class LegalParamsRecalcScheduler {
  private running = false;
  private initialTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly run: () => Promise<Resumo>;
  private readonly log: JobLogger;
  private readonly alert: (payload: AlertPayload) => void;

  constructor(deps: LegalParamsRecalcSchedulerDeps = {}) {
    this.run = deps.run ?? (() => getFactory().getTaxAssessmentRecalcService().processarPendentes());
    this.log = deps.log ?? logger;
    this.alert = deps.alert ?? sendAlertWebhook;
  }

  async runOnce(): Promise<Resumo | { skipped: 'lock' }> {
    if (this.running) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'skipped_due_to_lock' });
      return { skipped: 'lock' };
    }
    this.running = true;
    try {
      const summary = await this.run();
      if (summary.falhas > 0) this.log.event('warn', 'job.completed', JOB, { job: JOB, ...summary });
      else this.log.event('info', 'job.completed', JOB, { job: JOB, ...summary });
      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.event('error', 'job.failed', JOB, { job: JOB, error: message });
      this.alert({ source: 'legal_params_recalc', event: 'job_failed', timestamp: new Date().toISOString(), job: JOB, error: message });
      throw error;
    } finally {
      this.running = false;
    }
  }

  /** Item 10 — "publicar enfileira": uma passada já, sem esperar o intervalo. Sob teste, só com `allowInTest`. */
  kick(options: { allowInTest?: boolean } = {}): void {
    if (process.env.NODE_ENV === 'test' && !options.allowInTest) return;
    setImmediate(() => {
      // eslint-disable-next-line no-restricted-syntax -- SANCTIONED: já registrado e alertado em runOnce (job.failed); o timer não pode morrer (OBS-R8)
      void this.runOnce().catch(() => {
        /* já logado em runOnce (job.failed) */
      });
    });
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
    const intervalMs = options.intervalMs ?? readMsEnv('LEGAL_PARAMS_RECALC_INTERVAL_MS', DEFAULT_INTERVAL_MS, 1);
    const initialDelayMs = options.initialDelayMs ?? readMsEnv('LEGAL_PARAMS_RECALC_INITIAL_DELAY_MS', DEFAULT_INITIAL_DELAY_MS, 0);
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

export const legalParamsRecalcScheduler = new LegalParamsRecalcScheduler();
