/**
 * SchedulingHrAbsenceReconcileScheduler — BE-INCR-ESCALA-BASE item 46 (F-ESC-7, etapa a1). Uma vez por dia, para cada
 * dono que tem a escala, roda o `HrAbsenceProjectionService.reconcile`: o afastamento lançado no DP chega à agenda em até
 * 24 h (o a2 do F-ESC-7, o DP chamar depois do commit, é do BRIEF do DP). A janela anda com o dia, e o reconcile renova o
 * afastamento em aberto.
 *
 * Molde do `SchedulingHolidaySyncScheduler` (item 41): lock process-local, sem timer sob NODE_ENV=test a menos que
 * `allowInTest`, falha → `job.failed` + alerta remoto (F-OBS-7 a; caso no `schedulerFailureAlert.test.ts`, F-OBS-14). Um
 * dono que falha não impede os outros; a rodada falha no fim, com a contagem. Log sem PII (ADR-OBSERVABILIDADE): só ids e
 * contagens — o adaptador do DP lê CPF e nome, e nada disso sai dele.
 *
 * O dia da janela é a data UTC do relógio: na virada local, a janela de 400 dias cobre a diferença de horas.
 */
import logger, { type EventLogger } from '../lib/logger';
import { sendAlertWebhook, type AlertPayload } from '../lib/alertWebhook';
import type { UserContext } from '../lib/authUtils';
import { getFactory } from '../lib/factory';
import type { HrAbsenceReconcileResult } from '../features/scheduling/services/HrAbsenceProjectionService';
import { ownerContext } from './SchedulingHolidaySyncScheduler';
import { readMsEnv } from './readMsEnv';

const JOB = 'scheduling_hr_absence_reconcile';
const DEFAULT_INTERVAL_MS = 86_400_000; // diário
const DEFAULT_INITIAL_DELAY_MS = 240_000;

type JobLogger = EventLogger;

export interface SchedulingHrAbsenceSummary extends HrAbsenceReconcileResult {
  owners: number;
  failed: number;
  today: string;
}

export interface HrAbsencePassDeps {
  owners: () => Promise<string[]>;
  contextOf: (userId: string) => Promise<UserContext | null>;
  reconcile: (user: UserContext, today: string) => Promise<HrAbsenceReconcileResult>;
  log: JobLogger;
  now?: () => Date;
}

/** Item 46 — a passada sobre todos os donos; lança no fim se algum falhou (depois de tentar todos). */
export async function reconcileHrAbsencesForAllOwners(deps: HrAbsencePassDeps): Promise<SchedulingHrAbsenceSummary> {
  const today = (deps.now ?? (() => new Date()))().toISOString().slice(0, 10);
  const summary: SchedulingHrAbsenceSummary = {
    owners: 0,
    failed: 0,
    today,
    created: 0,
    updated: 0,
    deleted: 0,
    unchanged: 0,
    skippedNoEmployeeRef: 0,
    skippedUnitNotLive: 0,
  };
  for (const userId of await deps.owners()) {
    const user = await deps.contextOf(userId);
    if (!user) continue;
    summary.owners += 1;
    try {
      const r = await deps.reconcile(user, today);
      summary.created += r.created;
      summary.updated += r.updated;
      summary.deleted += r.deleted;
      summary.unchanged += r.unchanged;
      summary.skippedNoEmployeeRef += r.skippedNoEmployeeRef;
      summary.skippedUnitNotLive += r.skippedUnitNotLive;
    } catch (error) {
      summary.failed += 1;
      deps.log.event('error', 'job.reconcile_item_failed', JOB, { job: JOB, userId, error: error instanceof Error ? error.message : String(error) });
    }
  }
  if (summary.failed > 0) {
    throw new Error(`scheduling_hr_absence_reconcile: ${summary.failed} de ${summary.owners} dono(s) falharam`);
  }
  return summary;
}

function defaultRun(log: JobLogger): () => Promise<SchedulingHrAbsenceSummary> {
  return () => {
    const f = getFactory();
    return reconcileHrAbsencesForAllOwners({
      owners: () => f.getSchedulingRowRepository().ownersWithTable('scheduleExceptions'),
      contextOf: ownerContext,
      reconcile: (user, today) => f.getHrAbsenceProjectionService().reconcile(user, today),
      log,
    });
  };
}

export interface SchedulingHrAbsenceReconcileSchedulerDeps {
  run?: () => Promise<SchedulingHrAbsenceSummary>;
  log?: JobLogger;
  alert?: (payload: AlertPayload) => void;
}

export interface SchedulingHrAbsenceReconcileSchedulerStartOptions {
  intervalMs?: number;
  initialDelayMs?: number;
  allowInTest?: boolean;
}

export class SchedulingHrAbsenceReconcileScheduler {
  private running = false;
  private initialTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly run: () => Promise<SchedulingHrAbsenceSummary>;
  private readonly log: JobLogger;
  private readonly alert: (payload: AlertPayload) => void;

  constructor(deps: SchedulingHrAbsenceReconcileSchedulerDeps = {}) {
    this.log = deps.log ?? logger;
    this.run = deps.run ?? defaultRun(this.log);
    this.alert = deps.alert ?? sendAlertWebhook;
  }

  async runOnce(): Promise<SchedulingHrAbsenceSummary | { skipped: 'lock' }> {
    if (this.running) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'skipped_due_to_lock' });
      return { skipped: 'lock' };
    }
    this.running = true;
    try {
      const summary = await this.run();
      // Vínculo sem pessoa operacional não chega à agenda: warn, para aparecer.
      const level = summary.skippedNoEmployeeRef > 0 || summary.skippedUnitNotLive > 0 ? 'warn' : 'info';
      this.log.event(level, 'job.completed', JOB, { job: JOB, ...summary });
      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.event('error', 'job.failed', JOB, { job: JOB, error: message });
      this.alert({ source: 'scheduling_hr_absence_reconcile', event: 'job_failed', timestamp: new Date().toISOString(), job: JOB, error: message });
      throw error;
    } finally {
      this.running = false;
    }
  }

  start(options: SchedulingHrAbsenceReconcileSchedulerStartOptions = {}): void {
    if (process.env.NODE_ENV === 'test' && !options.allowInTest) {
      this.log.event('info', 'job.skipped', JOB, { job: JOB, reason: 'disabled_in_test' });
      return;
    }
    if (this.initialTimer || this.intervalTimer) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'already_started' });
      return;
    }
    const intervalMs = options.intervalMs ?? readMsEnv('SCHEDULING_HR_ABSENCE_INTERVAL_MS', DEFAULT_INTERVAL_MS, 1);
    const initialDelayMs = options.initialDelayMs ?? readMsEnv('SCHEDULING_HR_ABSENCE_INITIAL_DELAY_MS', DEFAULT_INITIAL_DELAY_MS, 0);

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

export const schedulingHrAbsenceReconcileScheduler = new SchedulingHrAbsenceReconcileScheduler();
