/**
 * Onda 4 / 4.1 — L1 da revisão independente do #1392. `pollPendingOnce` GRAVA `pollGaveUpAt`/`pollAlertedAt` e devolve os ids
 * a alertar no `summary`; o webhook sai no `DfePollScheduler`. Antes, as fases seguintes do mesmo tick (contingência, eventos,
 * dreno de anexo) rodavam no mesmo `await` sequencial: se uma lançasse, o `summary` se perdia, o alerta nunca saía e, como o
 * marcador "já alertei" já estava no banco, o documento saía da fila e nunca realertava (alerta perdido de forma permanente).
 *
 * Guarda: fase que lança NÃO derruba o tick — o alerta de desistência/adiamento sai, as fases seguintes ainda rodam, a falha
 * da fase é registrada (OBS-R8, `job.failed` com a fase) e alertada (`job_failed`, OBS-R11). O mesmo molde de
 * `purgeStepIsolation.test.ts`.
 */
import { DfePollScheduler } from '../DfePollScheduler';
import { runDfePollPending } from '../dfePollPending.job';
import { getFactory } from '../../lib/factory';
import logger from '../../lib/logger';

jest.mock('../../lib/factory', () => ({ getFactory: jest.fn() }));

const SUMMARY_DO_POLL = {
  total: 3,
  updated: 0,
  skipped: 0,
  failed: 0,
  gaveUp: 1,
  gaveUpIds: ['doc-desistiu'],
  transporteAdiadoAlerta: 1,
  transporteAdiadoIds: ['doc-adiado'],
};
const CONTINGENCIA_OK = { alertas: [], failed: 0, orfasFalharam: 0, pertoDoPrazo: 0, vencidas: 0 };
const EVENTOS_OK = { failed: 0, ignorados: 0, substituidasFora: 0 };
const ANEXOS_OK = { failed: 0 };

type Fase = 'contingencia' | 'eventos' | 'anexos';

function montarFactory(quebra?: Fase) {
  const falha = (fase: Fase) => (quebra === fase ? Promise.reject(new Error(`boom-${fase}`)) : undefined);
  const fases = {
    pollPendingOnce: jest.fn().mockResolvedValue(SUMMARY_DO_POLL),
    pollEventosOnce: jest.fn().mockImplementation(() => falha('eventos') ?? Promise.resolve(EVENTOS_OK)),
    drainPendingAttachmentsOnce: jest.fn().mockImplementation(() => falha('anexos') ?? Promise.resolve(ANEXOS_OK)),
    tick: jest.fn().mockImplementation(() => falha('contingencia') ?? Promise.resolve(CONTINGENCIA_OK)),
  };
  (getFactory as jest.Mock).mockReturnValue({
    getFiscalDocumentLifecycleService: () => fases,
    getNfceContingenciaService: () => ({ tick: fases.tick }),
  });
  return fases;
}

const eventos = (alert: jest.Mock, event: string) => alert.mock.calls.map(([p]) => p).filter((p) => p.event === event);

describe('dfe_poll_pending — fase seguinte que lança não perde o alerta de desistência/adiamento (L1 do #1392)', () => {
  let logSpy: jest.SpyInstance;
  beforeEach(() => {
    logSpy = jest.spyOn(logger, 'event').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it.each<Fase>(['contingencia', 'eventos', 'anexos'])('fase "%s" lança ⇒ os alertas de desistência e de adiamento ainda saem', async (quebra) => {
    montarFactory(quebra);
    const alert = jest.fn();
    const scheduler = new DfePollScheduler({ poll: runDfePollPending, log: { event: jest.fn() }, alert });

    const resultado = await scheduler.runOnce();

    const resumos = eventos(alert, 'reconcile_summary');
    expect(resumos.find((p) => p.pollGaveUp === 1)).toMatchObject({ pollGaveUpDocumentIds: ['doc-desistiu'] });
    expect(resumos.find((p) => p.transporteAdiado === 1)).toMatchObject({ transporteAdiadoDocumentIds: ['doc-adiado'] });
    // A falha da fase não some: alerta de job + resumo marcado.
    expect(eventos(alert, 'job_failed')).toEqual([expect.objectContaining({ source: 'dfe_poll', fases: [quebra], error: `boom-${quebra}` })]);
    expect(resultado).toMatchObject({ fasesFalharam: [{ fase: quebra, error: `boom-${quebra}` }] });
  });

  it('fase que lança é registrada (OBS-R8) com a fase e a mensagem, em nível error', async () => {
    montarFactory('contingencia');
    await new DfePollScheduler({ poll: runDfePollPending, log: { event: jest.fn() }, alert: jest.fn() }).runOnce();
    expect(logSpy).toHaveBeenCalledWith('error', 'job.failed', 'dfe_poll_pending', expect.objectContaining({ fase: 'contingencia', error: 'boom-contingencia' }));
  });

  it('as fases seguintes ainda rodam depois de uma que lança (contingência ⇒ eventos e anexos)', async () => {
    const fases = montarFactory('contingencia');
    await new DfePollScheduler({ poll: runDfePollPending, log: { event: jest.fn() }, alert: jest.fn() }).runOnce();
    expect(fases.pollEventosOnce).toHaveBeenCalledTimes(1);
    expect(fases.drainPendingAttachmentsOnce).toHaveBeenCalledTimes(1);
  });

  it('controle: nenhuma fase lança ⇒ sem job_failed e sem fasesFalharam; os alertas saem como antes', async () => {
    montarFactory();
    const alert = jest.fn();
    const resultado = await new DfePollScheduler({ poll: runDfePollPending, log: { event: jest.fn() }, alert }).runOnce();
    expect(eventos(alert, 'job_failed')).toHaveLength(0);
    expect(resultado).not.toHaveProperty('fasesFalharam');
    expect(eventos(alert, 'reconcile_summary')).toHaveLength(2);
  });
});
