/**
 * ProposalExpiryScheduler — BE-INCR-TEAMMATES PR-7 item 33. A cada intervalo marca `EXPIRED` a proposta `PENDING` cujo
 * `expiresAt` passou (as do chat não têm prazo próprio e seguem com o reaper do chat, L-PR7-3). Molde de
 * `VecOrphanSweepScheduler`: lock process-local, sem timer sob NODE_ENV=test a menos que `allowInTest`, falha →
 * `job.failed` + alerta remoto (OBS-R11) e o tick seguinte tenta de novo. Relógio injetado para o teste.
 */
import logger, { type EventLogger } from '../lib/logger';
import { sendAlertWebhook, type AlertPayload } from '../lib/alertWebhook';
import { getFactory } from '../lib/factory';

const JOB = 'proposal_expiry';
const DEFAULT_INTERVAL_MS = 15 * 60_000; // 15 min: o confirmar já recusa a vencida na hora (L-PR7-4)
const DEFAULT_INITIAL_DELAY_MS = 90_000;

export interface ProposalExpirySummary {
  expired: number;
}

export interface ProposalExpirySchedulerDeps {
  expire?: (now: Date) => Promise<number>;
  clock?: () => Date;
  log?: EventLogger;
  alert?: (payload: AlertPayload) => void;
}

export interface ProposalExpirySchedulerStartOptions {
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

function defaultExpire(now: Date): Promise<number> {
  return getFactory().getProposalInboxService().expireDue(now);
}

export class ProposalExpiryScheduler {
  private running = false;
  private initialTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly expire: (now: Date) => Promise<number>;
  private readonly clock: () => Date;
  private readonly log: EventLogger;
  private readonly alert: (payload: AlertPayload) => void;

  constructor(deps: ProposalExpirySchedulerDeps = {}) {
    this.expire = deps.expire ?? defaultExpire;
    this.clock = deps.clock ?? (() => new Date());
    this.log = deps.log ?? logger;
    this.alert = deps.alert ?? sendAlertWebhook;
  }

  async runOnce(): Promise<ProposalExpirySummary | { skipped: 'lock' }> {
    if (this.running) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'skipped_due_to_lock' });
      return { skipped: 'lock' };
    }
    this.running = true;
    try {
      const expired = await this.expire(this.clock());
      this.log.event('info', 'job.completed', JOB, { job: JOB, expired });
      return { expired };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.event('error', 'job.failed', JOB, { job: JOB, error: message });
      this.alert({ source: 'proposal_expiry', event: 'job_failed', timestamp: new Date().toISOString(), job: JOB, error: message });
      throw error;
    } finally {
      this.running = false;
    }
  }

  start(options: ProposalExpirySchedulerStartOptions = {}): void {
    if (process.env.NODE_ENV === 'test' && !options.allowInTest) {
      this.log.event('info', 'job.skipped', JOB, { job: JOB, reason: 'disabled_in_test' });
      return;
    }
    if (this.initialTimer || this.intervalTimer) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'already_started' });
      return;
    }
    const intervalMs = options.intervalMs ?? readMsEnv('PROPOSAL_EXPIRY_INTERVAL_MS', DEFAULT_INTERVAL_MS, 1);
    const initialDelayMs = options.initialDelayMs ?? readMsEnv('PROPOSAL_EXPIRY_INITIAL_DELAY_MS', DEFAULT_INITIAL_DELAY_MS, 0);

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

export const proposalExpiryScheduler = new ProposalExpiryScheduler();
