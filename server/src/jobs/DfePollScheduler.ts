/**
 * DfePollScheduler — BE-INCR-DFE (nó X10b, BRIEF item 27). Clone MÍNIMO de
 * `AccountingSyncScheduler` (decisão D1 do implementador — "parametrizar o scheduler existente ou
 * clone mínimo": genericizar o scheduler existente tocaria um job estável e não relacionado por
 * um benefício nulo neste porte). Mesmo desenho: lock process-local, sem timer sob NODE_ENV=test
 * a menos que `allowInTest`.
 *
 * ⚠️ Lock PROCESS-LOCAL — mesma ressalva de `AccountingSyncScheduler` (não protege multi-réplica).
 * atalho: lock local; upgrade a lease distribuída só se multi-réplica.
 */
import logger, { type EventLogger } from '../lib/logger';
import { deliverAlertWebhook, sendAlertWebhook, type AlertDelivery, type AlertPayload } from '../lib/alertWebhook';
import { confirmarAlertasDePoll, readDfePollAfterMs, runDfePollPending } from './dfePollPending.job';
import type { AlertaDePoll, PollSummary } from '../features/accounting/services/FiscalDocumentLifecycleService';
import { scopeDay } from '../features/accounting/models/dates';
import type { ContingenciaTickSummary } from '../features/accounting/dtos/NfceContingenciaDto';
import { readMsEnv } from './readMsEnv';

const JOB = 'dfe_poll_pending';
const DEFAULT_INTERVAL_MS = 120_000; // 2 minutos
const DEFAULT_INITIAL_DELAY_MS = 30_000;
/** C3: o "dia corrido" do alerta é o de Brasília (fuso constante do AccountingScope), não o UTC. */
const FUSO_DO_ALERTA = { timeZone: 'America/Sao_Paulo' };

/** Gate P4 (ADR-OBSERVABILIDADE OBS-R9): every scheduler line carries a `job.*` catalog event. */
type JobLogger = EventLogger;

export interface DfePollSchedulerDeps {
  poll?: () => Promise<PollSummary>;
  log?: JobLogger;
  /** Nó OBS, item 10 (F-OBS-7 a): remote alert on failure. Default = the fire-and-forget webhook. */
  alert?: (payload: AlertPayload) => void;
  /**
   * Lacuna 2374: entrega do alerta cujo "já alertei" fica gravado no documento (desistência do poll, adiamento por transporte).
   * Devolve o resultado da entrega; só `delivered`/`disabled` liberam `confirmarAlertas`. Default = `deliverAlertWebhook`.
   */
  entregarAlerta?: (payload: AlertPayload) => Promise<AlertDelivery>;
  /** Lacuna 2374: grava o marcador dos documentos de um alerta já entregue. Default = `confirmarAlertasDePoll` (serviço). */
  confirmarAlertas?: (tipo: AlertaDePoll, documentIds: readonly string[]) => Promise<unknown>;
}

export interface DfePollSchedulerStartOptions {
  intervalMs?: number;
  initialDelayMs?: number;
  allowInTest?: boolean;
}

export class DfePollScheduler {
  private running = false;
  private initialTimer: NodeJS.Timeout | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly poll: () => Promise<PollSummary>;
  private readonly log: JobLogger;
  private readonly alert: (payload: AlertPayload) => void;
  private readonly entregarAlerta: (payload: AlertPayload) => Promise<AlertDelivery>;
  private readonly confirmarAlertas: (tipo: AlertaDePoll, documentIds: readonly string[]) => Promise<unknown>;
  /** C3: `evento:documentId` → dia do último alerta. Sem teto; o dia que passou sai no próximo tick. Process-local, como o lock. */
  private readonly alertadas = new Map<string, string>();

  constructor(deps: DfePollSchedulerDeps = {}) {
    this.poll = deps.poll ?? runDfePollPending;
    this.log = deps.log ?? logger;
    this.alert = deps.alert ?? sendAlertWebhook;
    this.entregarAlerta = deps.entregarAlerta ?? deliverAlertWebhook;
    this.confirmarAlertas = deps.confirmarAlertas ?? confirmarAlertasDePoll;
  }

  /**
   * Lacuna 2374 (dono 25/11/2026) — ALERTA PRIMEIRO, MARCADOR DEPOIS. Entrega o webhook e só com `delivered` (ou `disabled`: sem
   * webhook configurado não há canal a esperar, e exigir entrega travaria o marcador para sempre) manda o serviço gravar o
   * "já alertei". `failed` ⇒ marcador não gravado ⇒ o documento segue na fila e realerta no próximo tick elegível — o da desistência
   * ao fim do backoff de 1 h (ressalva (d) do #1414: ~1 consulta e 1 alerta por hora por documento), o de transporte no tick seguinte
   * (a falha já saiu como `alert.failed`). Trade-off: entrega ao-menos-uma-vez — dois processos, ou uma gravação que falha depois da entrega,
   * dão alerta DUPLICADO, nunca alerta perdido. Nunca lança: a falha da confirmação é logada e o marcador fica para o realerta.
   */
  private async alertarComMarcador(tipo: AlertaDePoll, payload: AlertPayload, documentIds: readonly string[]): Promise<void> {
    const entrega = await this.entregarAlerta(payload);
    // `failed` já saiu como `alert.failed` (o webhook loga a si mesmo); aqui só não se grava o marcador.
    if (entrega === 'failed') return;
    try {
      await this.confirmarAlertas(tipo, documentIds);
    } catch (error) {
      this.log.event('error', 'job.failed', JOB, {
        job: JOB,
        fase: 'confirmar_alerta',
        tipo,
        documentIds,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
      // BE-INCR-DFE-EVENTOS PR-2 (item 18): falha ao consultar eventos, evento ignorado (A3) ou nota substituída fora do
      // Luminaris pedem atenção — warn com o resumo (os avisos nomeiam a nota por número e série).
      const e = summary.eventos;
      if (
        summary.failed > 0 ||
        (summary.gaveUp ?? 0) > 0 ||
        (summary.transporteAdiadoAlerta ?? 0) > 0 ||
        (summary.attachments?.failed ?? 0) > 0 ||
        (summary.fasesFalharam?.length ?? 0) > 0 ||
        (c && c.failed + c.orfasFalharam + c.pertoDoPrazo + c.vencidas > 0) ||
        (e && e.failed + e.ignorados + e.substituidasFora > 0)
      ) {
        this.log.event('warn', 'job.completed', JOB, { job: JOB, ...summary });
      } else {
        this.log.event('info', 'job.completed', JOB, { job: JOB, ...summary });
      }
      // Onda 4 / 4.1: o job desistiu de consultar documento(s) (teto de falhas seguidas ou erro permanente). O documento segue
      // SENT/PROCESSING — alguém precisa consultar na mão ou investigar. Lacuna 2374: o job só PARA de consultar (`pollGaveUpAt`) depois
      // que este alerta for entregue; falha de entrega ⇒ o documento volta ao fim do backoff de 1 h e o alerta é refeito.
      if ((summary.gaveUp ?? 0) > 0) {
        const ids = summary.gaveUpIds ?? [];
        await this.alertarComMarcador(
          'desistencia',
          {
            source: 'dfe_poll',
            event: 'reconcile_summary',
            timestamp: new Date().toISOString(),
            job: JOB,
            pollGaveUp: summary.gaveUp,
            pollGaveUpDocumentIds: ids,
          },
          ids,
        );
      }
      // Lacuna 92c5 (dono 24/11): documento adiado por transporte (assinador local) indisponível há ≥ 1 h. O service devolve o id
      // UMA vez por episódio — o marcador `pollAlertedAt` só é gravado depois da entrega (lacuna 2374), então não há dedupe de dia
      // aqui; sem entrega o id volta no tick seguinte. O documento segue adiado.
      if ((summary.transporteAdiadoAlerta ?? 0) > 0) {
        const ids = summary.transporteAdiadoIds ?? [];
        await this.alertarComMarcador(
          'transporte',
          {
            source: 'dfe_poll',
            event: 'reconcile_summary',
            timestamp: new Date().toISOString(),
            job: JOB,
            transporteAdiado: summary.transporteAdiadoAlerta,
            transporteAdiadoDocumentIds: ids,
          },
          ids,
        );
      }
      // X10a PR-9 (decisões 6, 7 e 9): NFC-e off-line perto do prazo/vencida ou órfã não resolvida ⇒ alerta remoto.
      // C3: no máximo 1 vez por nota, por evento e por dia — o tick de 2 min repetia o mesmo aviso ~720 vezes por dia.
      const novas = c ? this.alertasNovas(c.alertas) : [];
      if (novas.length > 0) {
        const conta = (evento: string) => novas.filter((a) => a.evento === evento).length;
        this.alert({
          source: 'dfe_poll',
          event: 'reconcile_summary',
          timestamp: new Date().toISOString(),
          job: JOB,
          contingenciaPertoDoPrazo: conta('PERTO_DO_PRAZO'),
          contingenciaVencidas: conta('VENCIDA'),
          contingenciaOrfasFalharam: conta('ORFA_FALHOU'),
          contingenciaAlertas: novas,
        });
      }
      // L1 do #1392: fase posterior ao poll lançou (já registrada em `job.failed` pelo job). Alerta POR ÚLTIMO — os alertas de
      // desistência/adiamento acima dependem só do poll e não podem esperar nem se perder por causa dela.
      const fases = summary.fasesFalharam ?? [];
      if (fases.length > 0) {
        this.alert({
          source: 'dfe_poll',
          event: 'job_failed',
          timestamp: new Date().toISOString(),
          job: JOB,
          fases: fases.map((f) => f.fase),
          error: fases.map((f) => f.error).join(' | '),
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

  private alertasNovas(alertas: ContingenciaTickSummary['alertas']): ContingenciaTickSummary['alertas'] {
    const hoje = scopeDay(FUSO_DO_ALERTA, new Date());
    for (const [chave, dia] of this.alertadas) if (dia !== hoje) this.alertadas.delete(chave);
    return alertas.filter((a) => {
      const chave = `${a.evento}:${a.documentId}`;
      if (this.alertadas.has(chave)) return false;
      this.alertadas.set(chave, hoje);
      return true;
    });
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
    readDfePollAfterMs(); // BRD F-71.1: o limiar lido a cada tick também falha no boot

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
