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
import logger, { type EventLogger } from '../lib/logger';
import { sendAlertWebhook, type AlertPayload } from '../lib/alertWebhook';
import { runDfePollPending } from './dfePollPending.job';
import type { PollSummary } from '../features/accounting/services/FiscalDocumentLifecycleService';

const JOB = 'dfe_poll_pending';
const DEFAULT_INTERVAL_MS = 120_000; // 2 minutos
const DEFAULT_INITIAL_DELAY_MS = 30_000;

/** Gate P4 (ADR-OBSERVABILIDADE OBS-R9): every scheduler line carries a `job.*` catalog event. */
type JobLogger = EventLogger;

export interface DfePollSchedulerDeps {
  poll?: () => Promise<PollSummary>;
  log?: JobLogger;
  /** Nó OBS, item 10 (F-OBS-7 a): remote alert on failure. Default = the fire-and-forget webhook. */
  alert?: (payload: AlertPayload) => void;
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
  private readonly alert: (payload: AlertPayload) => void;

  constructor(deps: DfePollSchedulerDeps = {}) {
    this.poll = deps.poll ?? runDfePollPending;
    this.log = deps.log ?? logger;
    this.alert = deps.alert ?? sendAlertWebhook;
  }

  async runOnce(): Promise<PollSummary | { skipped: 'lock' }> {
    if (this.running) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'skipped_due_to_lock' });
      return { skipped: 'lock' };
    }
    this.running = true;
    try {
      const summary = await this.poll();
      const c = summary.contingencia;
      if (summary.failed > 0 || (summary.attachments?.failed ?? 0) > 0 || (c && c.failed + c.orfasFalharam + c.pertoDoPrazo + c.vencidas > 0)) {
        this.log.event('warn', 'job.completed', JOB, { job: JOB, ...summary });
      } else {
        this.log.event('info', 'job.completed', JOB, { job: JOB, ...summary });
      }
      // X10a PR-9 (decisões 6, 7 e 9): NFC-e off-line perto do prazo/vencida ou órfã não resolvida ⇒ alerta remoto.
      if (c && c.pertoDoPrazo + c.vencidas + c.orfasFalharam > 0) {
        this.alert({
          source: 'dfe_poll',
          event: 'reconcile_summary',
          timestamp: new Date().toISOString(),
          job: JOB,
          contingenciaPertoDoPrazo: c.pertoDoPrazo,
          contingenciaVencidas: c.vencidas,
          contingenciaOrfasFalharam: c.orfasFalharam,
        });
      }
      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.event('error', 'job.failed', JOB, { job: JOB, error: message });
      this.alert({ source: 'dfe_poll', event: 'job_failed', timestamp: new Date().toISOString(), job: JOB, error: message });
      throw error;
    } finally {
      this.running = false;
    }
  }

  start(options: DfePollSchedulerStartOptions = {}): void {
    if (process.env.NODE_ENV === 'test' && !options.allowInTest) {
      this.log.event('info', 'job.skipped', JOB, { job: JOB, reason: 'disabled_in_test' });
      return;
    }
    if (this.initialTimer || this.intervalTimer) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'already_started' });
      return;
    }
    const intervalMs = options.intervalMs ?? readMsEnv('DFE_POLL_INTERVAL_MS', DEFAULT_INTERVAL_MS, 1);
    const initialDelayMs = options.initialDelayMs ?? readMsEnv('DFE_POLL_INITIAL_DELAY_MS', DEFAULT_INITIAL_DELAY_MS, 0);

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

export const dfePollScheduler = new DfePollScheduler();
