/**
 * LegalParamsRecalcScheduler — BE-INCR-LEGAL-PARAMS PR-4 (nó LEGAL-PARAMS; BRIEF §3 item 10; emenda §9 L-3: "Dispara na
 * publicação + varredura"). Clone mínimo de `DfePollScheduler`: varre `legal_parameter_recalc_jobs` PENDING no
 * intervalo e, além disso, `kick()` roda uma passada logo depois de publicar/revogar (fire-and-forget, fora da
 * requisição). Mesmo desenho: lock process-local, sem timer nem kick sob NODE_ENV=test a menos que `allowInTest`.
 *
 * ⚠️ Lock PROCESS-LOCAL — mesma ressalva de `AccountingSyncScheduler` (não protege multi-réplica).
 */
import logger from '../lib/logger';
import { getFactory } from '../lib/factory';

const JOB = 'legal_params_recalc';
const DEFAULT_INTERVAL_MS = 300_000; // 5 minutos
const DEFAULT_INITIAL_DELAY_MS = 30_000;

type Resumo = Awaited<ReturnType<ReturnType<ReturnType<typeof getFactory>['getTaxAssessmentRecalcService']>['processarPendentes']>>;

interface JobLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface LegalParamsRecalcSchedulerDeps {
  run?: () => Promise<Resumo>;
  log?: JobLogger;
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

  constructor(deps: LegalParamsRecalcSchedulerDeps = {}) {
    this.run = deps.run ?? (() => getFactory().getTaxAssessmentRecalcService().processarPendentes());
    this.log = deps.log ?? logger;
  }

  async runOnce(): Promise<Resumo | { skipped: 'lock' }> {
    if (this.running) {
      this.log.warn(JOB, { job: JOB, event: 'skipped', reason: 'skipped_due_to_lock' });
      return { skipped: 'lock' };
    }
    this.running = true;
    try {
      const summary = await this.run();
      if (summary.falhas > 0) this.log.warn(JOB, { job: JOB, event: 'complete', ...summary });
      else this.log.info(JOB, { job: JOB, event: 'complete', ...summary });
      return summary;
    } catch (error) {
      this.log.error(JOB, { job: JOB, event: 'failed', error: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      this.running = false;
    }
  }

  /** Item 10 — "publicar enfileira": uma passada já, sem esperar o intervalo. Sob teste, só com `allowInTest`. */
  kick(options: { allowInTest?: boolean } = {}): void {
    if (process.env.NODE_ENV === 'test' && !options.allowInTest) return;
    setImmediate(() => {
      void this.runOnce().catch(() => {
        /* já logado em runOnce(event:'failed') */
      });
    });
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
    const intervalMs = options.intervalMs ?? readMsEnv('LEGAL_PARAMS_RECALC_INTERVAL_MS', DEFAULT_INTERVAL_MS, 1);
    const initialDelayMs = options.initialDelayMs ?? readMsEnv('LEGAL_PARAMS_RECALC_INITIAL_DELAY_MS', DEFAULT_INITIAL_DELAY_MS, 0);
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

export const legalParamsRecalcScheduler = new LegalParamsRecalcScheduler();
