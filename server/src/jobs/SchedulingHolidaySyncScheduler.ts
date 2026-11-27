/**
 * SchedulingHolidaySyncScheduler — BE-INCR-ESCALA-BASE item 41 (F-ESC-6 a; F-ESC-18). Uma vez por dia, para cada dono
 * que tem a escala (`scheduleExceptions`), projeta os feriados do ano corrente e do seguinte em todas as unidades vivas
 * (`HolidayExceptionService.sync`, idempotente: o que já existe é pulado, o que o usuário apagou não volta). A unidade
 * nova recebe os feriados em até 24 h: não há gancho na criação da unidade (ela nasce por três caminhos, e o plugin não
 * lê o `LegalParameter`). O mesmo passo grava o fuso padrão da borda na unidade que nasceu sem fuso (F-ESC-18, emenda
 * 1db262968), o que fecha a janela da `L-20261126-205021-2f64`.
 *
 * Molde de `VecOrphanSweepScheduler`: lock process-local, sem timer sob NODE_ENV=test a menos que `allowInTest`,
 * falha → `job.failed` + alerta remoto (F-OBS-7 a; caso no `schedulerFailureAlert.test.ts`, F-OBS-14). Um dono que
 * falha não impede os outros: cada falha vai ao log com o `userId` (só ids, ADR-OBSERVABILIDADE), e no fim a rodada
 * falha com a contagem, para o alerta sair.
 *
 * O ano é o do relógio em UTC: na virada, o "seguinte" já cobre o ano que começa no fuso local.
 */
import logger, { type EventLogger } from '../lib/logger';
import { sendAlertWebhook, type AlertPayload } from '../lib/alertWebhook';
import type { UserContext } from '../lib/authUtils';
import { getFactory } from '../lib/factory';
import type { HolidaySyncResult } from '../features/scheduling/services/HolidayExceptionService';
import { readMsEnv } from './readMsEnv';

const JOB = 'scheduling_holiday_sync';
const DEFAULT_INTERVAL_MS = 86_400_000; // diário
const DEFAULT_INITIAL_DELAY_MS = 180_000;

type JobLogger = EventLogger;

export interface SchedulingHolidaySyncSummary extends HolidaySyncResult {
  owners: number;
  failed: number;
  years: number[];
}

/** As dependências da passada (injetáveis no teste; o padrão liga a factory). */
export interface HolidaySyncPassDeps {
  owners: () => Promise<string[]>;
  contextOf: (userId: string) => Promise<UserContext | null>;
  sync: (user: UserContext, input: { year: number }) => Promise<HolidaySyncResult>;
  log: JobLogger;
  now?: () => Date;
}

/** Item 41 — a passada sobre todos os donos; devolve o resumo e lança se algum dono falhou (depois de tentar todos). */
export async function syncHolidaysForAllOwners(deps: HolidaySyncPassDeps): Promise<SchedulingHolidaySyncSummary> {
  const year = (deps.now ?? (() => new Date()))().getUTCFullYear();
  const years = [year, year + 1];
  const summary: SchedulingHolidaySyncSummary = { owners: 0, created: 0, skipped: 0, deletedByUser: 0, failed: 0, years };
  for (const userId of await deps.owners()) {
    const user = await deps.contextOf(userId);
    if (!user) continue; // dono apagado com tabela órfã: nada a projetar
    summary.owners += 1;
    try {
      for (const y of years) {
        const r = await deps.sync(user, { year: y });
        summary.created += r.created;
        summary.skipped += r.skipped;
        summary.deletedByUser += r.deletedByUser;
      }
    } catch (error) {
      summary.failed += 1;
      deps.log.event('error', 'job.reconcile_item_failed', JOB, { job: JOB, userId, error: error instanceof Error ? error.message : String(error) });
    }
  }
  if (summary.failed > 0) {
    throw new Error(`scheduling_holiday_sync: ${summary.failed} de ${summary.owners} dono(s) falharam (created=${summary.created})`);
  }
  return summary;
}

async function ownerContext(userId: string): Promise<UserContext | null> {
  const u = await getFactory().getUserRepository().getUserById(userId);
  if (!u) return null;
  const name = u.name ?? u.username;
  return {
    id: u.id,
    userId: u.id,
    name,
    username: u.username,
    email: u.email,
    userEmail: u.email,
    userName: name,
    role: u.role,
    userRole: u.role,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function defaultRun(log: JobLogger): () => Promise<SchedulingHolidaySyncSummary> {
  return () => {
    const f = getFactory();
    return syncHolidaysForAllOwners({
      owners: () => f.getSchedulingRowRepository().ownersWithTable('scheduleExceptions'),
      contextOf: ownerContext,
      sync: (user, input) => f.getHolidayExceptionService().sync(user, input),
      log,
    });
  };
}

export interface SchedulingHolidaySyncSchedulerDeps {
  run?: () => Promise<SchedulingHolidaySyncSummary>;
  log?: JobLogger;
  alert?: (payload: AlertPayload) => void;
}

export interface SchedulingHolidaySyncSchedulerStartOptions {
  intervalMs?: number;
  initialDelayMs?: number;
  allowInTest?: boolean;
}

export class SchedulingHolidaySyncScheduler {
  private running = false;
  private initialTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly run: () => Promise<SchedulingHolidaySyncSummary>;
  private readonly log: JobLogger;
  private readonly alert: (payload: AlertPayload) => void;

  constructor(deps: SchedulingHolidaySyncSchedulerDeps = {}) {
    this.log = deps.log ?? logger;
    this.run = deps.run ?? defaultRun(this.log);
    this.alert = deps.alert ?? sendAlertWebhook;
  }

  async runOnce(): Promise<SchedulingHolidaySyncSummary | { skipped: 'lock' }> {
    if (this.running) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'skipped_due_to_lock' });
      return { skipped: 'lock' };
    }
    this.running = true;
    try {
      const summary = await this.run();
      this.log.event('info', 'job.completed', JOB, { job: JOB, ...summary, years: summary.years.join(',') });
      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.event('error', 'job.failed', JOB, { job: JOB, error: message });
      this.alert({ source: 'scheduling_holiday_sync', event: 'job_failed', timestamp: new Date().toISOString(), job: JOB, error: message });
      throw error;
    } finally {
      this.running = false;
    }
  }

  start(options: SchedulingHolidaySyncSchedulerStartOptions = {}): void {
    if (process.env.NODE_ENV === 'test' && !options.allowInTest) {
      this.log.event('info', 'job.skipped', JOB, { job: JOB, reason: 'disabled_in_test' });
      return;
    }
    if (this.initialTimer || this.intervalTimer) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'already_started' });
      return;
    }
    const intervalMs = options.intervalMs ?? readMsEnv('SCHEDULING_HOLIDAY_SYNC_INTERVAL_MS', DEFAULT_INTERVAL_MS, 1);
    const initialDelayMs = options.initialDelayMs ?? readMsEnv('SCHEDULING_HOLIDAY_SYNC_INITIAL_DELAY_MS', DEFAULT_INITIAL_DELAY_MS, 0);

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

export const schedulingHolidaySyncScheduler = new SchedulingHolidaySyncScheduler();
