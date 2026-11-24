/**
 * DfeSignerHealthScheduler — X10a EMENDA-4 AL-15 (ADR-OBSERVABILIDADE OBS-R11, gate F-OBS-14). Varre os assinadores locais
 * vivos e alerta (webhook) os quatro casos do `DfeSignerHealthService`: assinador sem poll com nota esperando, certificado
 * vencendo, NFC-e em contingência com o assinador fora e nota presa em `PENDING_SIGNATURE` com o assinador ONLINE (teto da retomada). Mesmo desenho do `DfePollScheduler`: lock process-local, sem
 * timer sob NODE_ENV=test a menos que `allowInTest`, `job_failed` no `catch` do `runOnce`.
 *
 * ⚠️ Lock PROCESS-LOCAL — mesma ressalva do `AccountingSyncScheduler` (uma instância por cliente, ADR-M2).
 */
import logger, { type EventLogger } from '../lib/logger';
import { sendAlertWebhook, type AlertPayload } from '../lib/alertWebhook';
import { runDfeSignerHealth } from './dfeSignerHealth.job';
import type { DfeSignerAlerta, DfeSignerHealthSummary } from '../features/accounting/services/DfeSignerHealthService';
import { scopeDay } from '../features/accounting/models/dates';
import { readMsEnv } from './readMsEnv';

const JOB = 'dfe_signer_health';
const DEFAULT_INTERVAL_MS = 300_000; // 5 minutos
const DEFAULT_INITIAL_DELAY_MS = 60_000;
/** O "dia corrido" do alerta é o de Brasília (fuso constante do AccountingScope), não o UTC. */
const FUSO_DO_ALERTA = { timeZone: 'America/Sao_Paulo' };

export interface DfeSignerHealthSchedulerDeps {
  verificar?: () => Promise<DfeSignerHealthSummary>;
  log?: EventLogger;
  /** F-OBS-7 a: remote alert. Default = the fire-and-forget webhook. */
  alert?: (payload: AlertPayload) => void;
}

export interface DfeSignerHealthSchedulerStartOptions {
  intervalMs?: number;
  initialDelayMs?: number;
  allowInTest?: boolean;
}

export class DfeSignerHealthScheduler {
  private running = false;
  private initialTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly verificar: () => Promise<DfeSignerHealthSummary>;
  private readonly log: EventLogger;
  private readonly alert: (payload: AlertPayload) => void;
  /** `evento:dispositivoId` → dia do último alerta: no máximo 1 por dispositivo, caso e dia (o tick é de 5 min). */
  private readonly alertadas = new Map<string, string>();

  constructor(deps: DfeSignerHealthSchedulerDeps = {}) {
    this.verificar = deps.verificar ?? runDfeSignerHealth;
    this.log = deps.log ?? logger;
    this.alert = deps.alert ?? sendAlertWebhook;
  }

  async runOnce(): Promise<DfeSignerHealthSummary | { skipped: 'lock' }> {
    if (this.running) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'skipped_due_to_lock' });
      return { skipped: 'lock' };
    }
    this.running = true;
    try {
      const summary = await this.verificar();
      const novas = this.alertasNovos(summary.alertas);
      this.log.event(summary.alertas.length > 0 ? 'warn' : 'info', 'job.completed', JOB, { job: JOB, dispositivos: summary.dispositivos, alertas: summary.alertas.length });
      if (novas.length > 0) {
        const conta = (evento: DfeSignerAlerta['evento']) => novas.filter((a) => a.evento === evento).length;
        this.alert({
          source: 'dfe_signer_health',
          event: 'reconcile_summary',
          timestamp: new Date().toISOString(),
          job: JOB,
          semPollComPendente: conta('ASSINADOR_SEM_POLL_COM_PENDENTE'),
          certificadoVencendo: conta('CERTIFICADO_VENCENDO'),
          contingenciaComAssinadorFora: conta('CONTINGENCIA_COM_ASSINADOR_FORA'),
          onlineComPendentePresa: conta('ASSINADOR_ONLINE_COM_PENDENTE_PRESA'),
          alertas: novas,
        });
      }
      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log.event('error', 'job.failed', JOB, { job: JOB, error: message });
      this.alert({ source: 'dfe_signer_health', event: 'job_failed', timestamp: new Date().toISOString(), job: JOB, error: message });
      throw error;
    } finally {
      this.running = false;
    }
  }

  private alertasNovos(alertas: DfeSignerAlerta[]): DfeSignerAlerta[] {
    const hoje = scopeDay(FUSO_DO_ALERTA, new Date());
    for (const [chave, dia] of this.alertadas) if (dia !== hoje) this.alertadas.delete(chave);
    return alertas.filter((a) => {
      const chave = `${a.evento}:${a.dispositivoId}`;
      if (this.alertadas.has(chave)) return false;
      this.alertadas.set(chave, hoje);
      return true;
    });
  }

  start(options: DfeSignerHealthSchedulerStartOptions = {}): void {
    if (process.env.NODE_ENV === 'test' && !options.allowInTest) {
      this.log.event('info', 'job.skipped', JOB, { job: JOB, reason: 'disabled_in_test' });
      return;
    }
    if (this.initialTimer || this.intervalTimer) {
      this.log.event('warn', 'job.skipped', JOB, { job: JOB, reason: 'already_started' });
      return;
    }
    const intervalMs = options.intervalMs ?? readMsEnv('DFE_SIGNER_HEALTH_INTERVAL_MS', DEFAULT_INTERVAL_MS, 1);
    const initialDelayMs = options.initialDelayMs ?? readMsEnv('DFE_SIGNER_HEALTH_INITIAL_DELAY_MS', DEFAULT_INITIAL_DELAY_MS, 0);

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

export const dfeSignerHealthScheduler = new DfeSignerHealthScheduler();
