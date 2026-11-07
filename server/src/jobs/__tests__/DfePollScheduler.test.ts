/**
 * C3 do HANDOFF-2026-11-02-delegacao-dono (nota D-2026-11-02-DELEGACAO-DONO §8): a NFC-e off-line perto do prazo,
 * vencida ou com a órfã que falhou alertava a cada tick (2 min ⇒ ~720 avisos por dia por nota). O alerta sai no máximo
 * 1 vez por nota, por evento e por dia corrido de America/Sao_Paulo (o fuso constante do AccountingScope).
 *
 * O poll, o log e o alerta são injetados; o relógio é o do jest (data fixa — nada de "hoje", que vira o dia em UTC
 * entre 00:00 e 03:00 de Brasília).
 */
import { DfePollScheduler } from '../DfePollScheduler';
import type { PollSummary } from '../../features/accounting/services/FiscalDocumentLifecycleService';

type Evento = 'PERTO_DO_PRAZO' | 'VENCIDA' | 'ORFA_FALHOU';

function resumo(alertas: { evento: Evento; documentId: string }[]): PollSummary {
  const conta = (e: Evento) => alertas.filter((a) => a.evento === e).length;
  return {
    total: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    contingencia: {
      transmitidas: 0,
      semComunicacao: 0,
      pertoDoPrazo: conta('PERTO_DO_PRAZO'),
      vencidas: conta('VENCIDA'),
      saidasAutomaticas: 0,
      orfasResolvidas: 0,
      orfasFalharam: conta('ORFA_FALHOU'),
      failed: 0,
      alertas,
    },
  } as PollSummary;
}

function montar(...ticks: PollSummary[]) {
  const poll = jest.fn<Promise<PollSummary>, []>();
  for (const t of ticks) poll.mockResolvedValueOnce(t);
  const alert = jest.fn();
  return { scheduler: new DfePollScheduler({ poll, log: { event: jest.fn() }, alert }), alert };
}

const prazoAlertas = (alert: jest.Mock) => alert.mock.calls.filter(([p]) => p.event === 'reconcile_summary');

describe('DfePollScheduler — alerta da NFC-e off-line uma vez por nota, por evento e por dia (C3)', () => {
  beforeEach(() => jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }));
  afterEach(() => jest.useRealTimers());

  const VENCIDA_A = { evento: 'VENCIDA' as const, documentId: 'doc-a' };

  it('dois ticks seguidos com a mesma nota vencida ⇒ 1 alerta', async () => {
    const { scheduler, alert } = montar(resumo([VENCIDA_A]), resumo([VENCIDA_A]));
    jest.setSystemTime(new Date('2026-11-03T15:00:00.000Z'));
    await scheduler.runOnce();
    jest.setSystemTime(new Date('2026-11-03T15:02:00.000Z'));
    await scheduler.runOnce();
    expect(prazoAlertas(alert)).toHaveLength(1);
  });

  it('controle: nota nova no 2º tick ⇒ alerta próprio, só com ela', async () => {
    const B = { evento: 'VENCIDA' as const, documentId: 'doc-b' };
    const { scheduler, alert } = montar(resumo([VENCIDA_A]), resumo([VENCIDA_A, B]));
    jest.setSystemTime(new Date('2026-11-03T15:00:00.000Z'));
    await scheduler.runOnce();
    jest.setSystemTime(new Date('2026-11-03T15:02:00.000Z'));
    await scheduler.runOnce();
    const enviados = prazoAlertas(alert);
    expect(enviados).toHaveLength(2);
    expect(enviados[1][0]).toMatchObject({ contingenciaVencidas: 1, contingenciaAlertas: [B] });
  });

  it('controle: a mesma nota muda de evento (perto do prazo → vencida) ⇒ alerta de novo', async () => {
    const PERTO_A = { evento: 'PERTO_DO_PRAZO' as const, documentId: 'doc-a' };
    const { scheduler, alert } = montar(resumo([PERTO_A]), resumo([VENCIDA_A]));
    jest.setSystemTime(new Date('2026-11-03T15:00:00.000Z'));
    await scheduler.runOnce();
    jest.setSystemTime(new Date('2026-11-03T15:02:00.000Z'));
    await scheduler.runOnce();
    expect(prazoAlertas(alert)).toHaveLength(2);
  });

  it('controle: dia seguinte ⇒ a mesma nota alerta de novo', async () => {
    const { scheduler, alert } = montar(resumo([VENCIDA_A]), resumo([VENCIDA_A]));
    jest.setSystemTime(new Date('2026-11-03T15:00:00.000Z'));
    await scheduler.runOnce();
    jest.setSystemTime(new Date('2026-11-04T15:00:00.000Z'));
    await scheduler.runOnce();
    expect(prazoAlertas(alert)).toHaveLength(2);
  });

  it('o dia é o de Brasília: 01:00 UTC de 04/11 ainda é 03/11 ⇒ não repete', async () => {
    const { scheduler, alert } = montar(resumo([VENCIDA_A]), resumo([VENCIDA_A]), resumo([VENCIDA_A]));
    jest.setSystemTime(new Date('2026-11-03T15:00:00.000Z'));
    await scheduler.runOnce();
    jest.setSystemTime(new Date('2026-11-04T01:00:00.000Z')); // 22:00 de 03/11 em Brasília
    await scheduler.runOnce();
    expect(prazoAlertas(alert)).toHaveLength(1);
    jest.setSystemTime(new Date('2026-11-04T03:00:00.000Z')); // 00:00 de 04/11 em Brasília
    await scheduler.runOnce();
    expect(prazoAlertas(alert)).toHaveLength(2);
  });
});

describe('DfePollScheduler — passo de eventos da NFS-e (BE-INCR-DFE-EVENTOS PR-2, item 18)', () => {
  const EVENTOS_OK = { consultadas: 3, canceladas: 1, substituidasFora: 0, ignorados: 0, skipped: 0, failed: 0, avisos: [] };
  const comEventos = (e: Partial<typeof EVENTOS_OK>): PollSummary => ({ total: 0, updated: 0, skipped: 0, failed: 0, eventos: { ...EVENTOS_OK, ...e } });
  const nivel = (log: { event: jest.Mock }) => log.event.mock.calls.find(([, ev]) => ev === 'job.completed')?.[0];

  it.each([
    ['falha ao consultar', { failed: 1 }],
    ['evento ignorado (A3)', { ignorados: 1, avisos: ['NFS-e nº 41 (DPS série 70001 nº 15): evento desconhecido (e999999) — ignorado.'] }],
    ['nota substituída fora do Luminaris', { substituidasFora: 1 }],
  ])('%s ⇒ job.completed em warn, com o resumo dos eventos', async (_n, e) => {
    const log = { event: jest.fn() };
    const scheduler = new DfePollScheduler({ poll: async () => comEventos(e), log, alert: jest.fn() });
    await scheduler.runOnce();
    expect(nivel(log)).toBe('warn');
    expect(log.event).toHaveBeenCalledWith('warn', 'job.completed', 'dfe_poll_pending', expect.objectContaining({ eventos: expect.objectContaining(e) }));
  });

  it('controle: eventos aplicados sem falha ⇒ info', async () => {
    const log = { event: jest.fn() };
    await new DfePollScheduler({ poll: async () => comEventos({}), log, alert: jest.fn() }).runOnce();
    expect(nivel(log)).toBe('info');
  });

  it('o passo de eventos lançando derruba o tick ⇒ job.failed + alerta remoto (OBS-R8)', async () => {
    const log = { event: jest.fn() };
    const alert = jest.fn();
    await expect(new DfePollScheduler({ poll: async () => Promise.reject(new Error('listParaEventos: database is locked')), log, alert }).runOnce()).rejects.toThrow('database is locked');
    expect(alert).toHaveBeenCalledWith(expect.objectContaining({ source: 'dfe_poll', event: 'job_failed', error: 'listParaEventos: database is locked' }));
  });
});
