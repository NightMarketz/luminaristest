/**
 * Lacuna 2374 (dono, 25/11/2026, questionário) — o alerta de DF-e (desistência do poll, adiamento por transporte ≥ 1 h) só pode
 * gravar o marcador "já alertei" (`pollGaveUpAt` / `pollAlertedAt`) DEPOIS da entrega confirmada do webhook. Falha de entrega ⇒
 * marcador não gravado ⇒ o próximo tick elegível realerta (versão incremental de um outbox: o próprio documento é a fila, sem
 * tabela nova).
 *
 * Antes: `pollPendingOnce` gravava o marcador no mesmo passo em que decidia alertar e o scheduler disparava um webhook
 * fire-and-forget; webhook fora do ar ⇒ marcador gravado, alerta perdido para sempre (o documento saía da fila do poll).
 *
 * Serviço, repositório e scheduler REAIS (SQLite); só o transporte (`fetch`) e o relógio são simulados. O alerta é provado pelo
 * corpo que o `fetch` recebeu, o marcador pelo que está no banco — nada de mock do que está sendo provado.
 */
const mockPort = {
  name: 'null',
  capabilities: { kinds: ['NFSE', 'NFE', 'NFCE'], numbersDps: false, consultar: true, cancelar: true, webhook: false },
  emitir: jest.fn(),
  consultar: jest.fn(),
  cancelar: jest.fn(),
  verifyWebhook: jest.fn(),
};
jest.mock('@/features/accounting/dfe/selectDfeEmissor', () => ({
  __esModule: true,
  selectDfeEmissor: () => ({ enabled: true, ambiente: 'homologacao', port: mockPort }),
}));

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { FiscalDocumentRepository } from '@/features/accounting/repositories/FiscalDocumentRepository';
import { FiscalDocumentLifecycleService } from '@/features/accounting/services/FiscalDocumentLifecycleService';
import { resolveAccountingScopeInternal } from '@/features/accounting/models/resolveAccountingScopeInternal';
import { DfeTransporteIndisponivelError, type EmissaoResult } from '@/features/accounting/dfe/DfeEmissorPort';
import { DfePollScheduler } from '../DfePollScheduler';

const DONO = 'u-dfe-alerta-marcador';
const UNIT = 'unit-dfe-alerta-marcador';
const WEBHOOK = 'https://alerts.example.com/hook';
const scope = resolveAccountingScopeInternal({ userId: DONO }, UNIT);
const repo = new FiscalDocumentRepository();
const service = new FiscalDocumentLifecycleService(
  repo,
  { getById: jest.fn(async (_s: unknown, id: string) => ({ id })) } as never,
  { upload: jest.fn(async () => ({ id: 'att' })) } as never,
  { attachSourceDocument: jest.fn(async () => ({ id: 'src' })), retireSourceDocument: jest.fn() } as never,
  { canEmitFiscalDocument: () => true, canCancelFiscalDocument: () => true } as never,
  { append: jest.fn() } as never,
  { findOverlapping: async () => [] } as never,
);

const HORA = 3_600_000;
const MIN = 60_000;
let seq = 0;
let relogio = Date.now() + 10 * HORA;
const row = (id: string) => prisma.fiscalDocument.findUniqueOrThrow({ where: { id } });

async function pendente(tag: string) {
  seq += 1;
  const doc = await repo.createSent(scope, {
    kind: 'NFSE',
    saleId: `sale-alerta-${tag}`,
    cTribNac: '060101',
    anchorEntryId: 'entry-x',
    ambiente: 'homologacao',
    partner: 'null',
    serie: 1,
    numero: BigInt(900 + seq),
    dCompet: '2026-10-07',
    vServCents: 10000n,
    tpRetISSQN: 1,
    payloadJson: '{"v":1}',
  });
  await repo.transition(scope, doc.id, { status: 'PROCESSING' });
  return doc;
}

/** Só o documento "ruim" falha; os demais do banco compartilhado seguem autorizando. */
function portaCom(ruim: string, falha: () => Error) {
  mockPort.consultar.mockImplementation(async (ref: string): Promise<EmissaoResult> => {
    if (ref.startsWith(ruim)) throw falha();
    return { status: 'AUTHORIZED', partnerRef: ref, chaveOuCodigo: `CH-${ref}`, numero: '1', errors: [] };
  });
}
const chamadasDe = (ruim: string) => mockPort.consultar.mock.calls.filter((c) => String(c[0]).startsWith(ruim)).length;
const erroPermanente = () => {
  try {
    z.object({ x: z.string() }).parse({});
  } catch (e) {
    return e as Error;
  }
  return new Error('inalcançável');
};
const caixaFora = () => new DfeTransporteIndisponivelError('dfe_assinador_sem_dispositivo', 'caixa desligada');

/** O scheduler de verdade, com o poll e a confirmação apontados para o serviço do teste e o relógio simulado. */
const scheduler = new DfePollScheduler({
  poll: () => service.pollPendingOnce(new Date(relogio), { now: new Date(relogio) }),
  log: { event: jest.fn() },
  confirmarAlertas: (tipo: string, ids: string[]) => service.confirmarAlertaDePoll(tipo as never, ids, new Date(relogio)),
} as never);
const tick = async (avanco: number) => {
  relogio += avanco;
  await scheduler.runOnce();
};

let fetchSpy: jest.SpyInstance;
const webhookFora = () => fetchSpy.mockRejectedValue(new TypeError('fetch failed'));
const webhookOk = () => fetchSpy.mockResolvedValue({ ok: true, status: 200 } as Response);
/** Quantas vezes o alerta deste documento foi TENTADO (o `fetch` recebeu o corpo), qualquer que tenha sido o resultado. */
const tentativasDeAlerta = (campoIds: 'pollGaveUpDocumentIds' | 'transporteAdiadoDocumentIds', id: string) =>
  fetchSpy.mock.calls.filter((c) => (JSON.parse(String(c[1].body))[campoIds] ?? []).includes(id)).length;

describe('Lacuna 2374 — marcador "já alertei" só depois da entrega confirmada do webhook (SQLite real)', () => {
  const ORIGINAL_URL = process.env.ALERT_WEBHOOK_URL;
  let logSpy: jest.SpyInstance;

  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({ data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' } });
  }, 120000);
  beforeEach(() => {
    mockPort.consultar.mockReset();
    process.env.ALERT_WEBHOOK_URL = WEBHOOK;
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    logSpy.mockRestore();
    if (ORIGINAL_URL === undefined) delete process.env.ALERT_WEBHOOK_URL;
    else process.env.ALERT_WEBHOOK_URL = ORIGINAL_URL;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('desistência do poll (pollGaveUpAt)', () => {
    it.each([
      ['rede fora (fetch rejeita)', () => fetchSpy.mockRejectedValue(new TypeError('fetch failed'))],
      ['endpoint responde 500', () => fetchSpy.mockResolvedValue({ ok: false, status: 500 } as Response)],
    ])('%s ⇒ marcador NÃO gravado e o tick seguinte realerta; ao entregar, grava e para de alertar', async (_nome, falhar) => {
      const d = await pendente(`desiste-${seq}`);
      portaCom(d.id, erroPermanente); // erro permanente: o job desiste já na 1ª falha
      falhar();

      await tick(HORA);
      expect(tentativasDeAlerta('pollGaveUpDocumentIds', d.id)).toBe(1);
      expect((await row(d.id)).pollGaveUpAt).toBeNull(); // webhook não entregou ⇒ nada de "já alertei"

      await tick(2 * MIN); // dentro da janela de backoff (1 h): a SEFAZ não é consultada de novo e nada realerta
      expect(tentativasDeAlerta('pollGaveUpDocumentIds', d.id)).toBe(1);

      await tick(HORA); // janela vencida: o documento segue na fila do job (não foi abandonado): realerta
      expect(tentativasDeAlerta('pollGaveUpDocumentIds', d.id)).toBe(2);
      expect((await row(d.id)).pollGaveUpAt).toBeNull();

      webhookOk();
      await tick(HORA);
      expect(tentativasDeAlerta('pollGaveUpDocumentIds', d.id)).toBe(3);
      const entregue = await row(d.id);
      expect(entregue.pollGaveUpAt?.getTime()).toBe(relogio); // entregue ⇒ marcador gravado, o job para
      expect(entregue.status).toBe('PROCESSING'); // desistir nunca decide o destino da nota

      const consultas = chamadasDe(d.id);
      await tick(HORA);
      await tick(HORA);
      expect(tentativasDeAlerta('pollGaveUpDocumentIds', d.id)).toBe(3); // sem realerta
      expect(chamadasDe(d.id)).toBe(consultas); // abandonado: o job não consulta mais
    });

    it('webhook ok na 1ª vez ⇒ marcador gravado no mesmo tick e um alerta só', async () => {
      const d = await pendente(`desiste-ok-${seq}`);
      portaCom(d.id, erroPermanente);
      webhookOk();
      await tick(HORA);
      await tick(HORA);
      expect(tentativasDeAlerta('pollGaveUpDocumentIds', d.id)).toBe(1);
      expect((await row(d.id)).pollGaveUpAt).not.toBeNull();
    });

    it('a consulta que volta a dar certo entre uma falha de entrega e a próxima NÃO deixa marcador para trás (nada a alertar)', async () => {
      const d = await pendente(`desiste-recupera-${seq}`);
      portaCom(d.id, erroPermanente);
      webhookFora();
      await tick(HORA);
      expect((await row(d.id)).pollGaveUpAt).toBeNull();

      mockPort.consultar.mockImplementation(
        async (ref: string): Promise<EmissaoResult> => ({ status: 'AUTHORIZED', partnerRef: ref, chaveOuCodigo: `CH-${ref}`, numero: '1', errors: [] }),
      );
      await tick(HORA); // janela de backoff vencida: a consulta que RESOLVE a nota continua possível
      const r = await row(d.id);
      expect(r.status).toBe('AUTHORIZED');
      expect(r.pollGaveUpAt).toBeNull();
      expect(tentativasDeAlerta('pollGaveUpDocumentIds', d.id)).toBe(1);
    });

    it('ressalva (d) do revisor do #1414: webhook fora por muitos ticks de 2 min ⇒ a SEFAZ é consultada no máximo 1× por janela de backoff (1 h); o alerta sai na 1ª consulta devida depois que o webhook volta', async () => {
      const d = await pendente(`desiste-backoff-${seq}`);
      portaCom(d.id, erroPermanente); // desiste já na 1ª falha: o alerta fica devido
      webhookFora();

      await tick(HORA);
      const inicio = relogio;
      expect(chamadasDe(d.id)).toBe(1);
      expect(tentativasDeAlerta('pollGaveUpDocumentIds', d.id)).toBe(1);

      // 62 ticks de 2 min (124 min, > 2 janelas): consultas só nas bordas de janela (0, 60 e 120 min), 1 alerta por consulta
      for (let i = 0; i < 62; i += 1) {
        await tick(2 * MIN);
        const janelas = Math.floor((relogio - inicio) / HORA) + 1;
        expect(chamadasDe(d.id)).toBeLessThanOrEqual(janelas);
      }
      expect(chamadasDe(d.id)).toBe(3);
      expect(tentativasDeAlerta('pollGaveUpDocumentIds', d.id)).toBe(3);
      expect((await row(d.id)).pollGaveUpAt).toBeNull();

      // o webhook volta no meio da janela (124 min): nada sai antes da borda (180 min) — e na borda sai, com o marcador
      webhookOk();
      for (let i = 0; i < 27; i += 1) await tick(2 * MIN);
      expect(chamadasDe(d.id)).toBe(3);
      expect(tentativasDeAlerta('pollGaveUpDocumentIds', d.id)).toBe(3);
      expect((await row(d.id)).pollGaveUpAt).toBeNull();

      await tick(2 * MIN); // 180 min: janela vencida ⇒ consulta devida
      expect(relogio - inicio).toBe(3 * HORA);
      expect(chamadasDe(d.id)).toBe(4);
      expect(tentativasDeAlerta('pollGaveUpDocumentIds', d.id)).toBe(4);
      expect((await row(d.id)).pollGaveUpAt?.getTime()).toBe(relogio); // entregue ⇒ o job para
      expect((await row(d.id)).status).toBe('PROCESSING');
    });

    it('sem ALERT_WEBHOOK_URL (ausência é configuração válida, não falha) ⇒ o marcador é gravado e o job para', async () => {
      delete process.env.ALERT_WEBHOOK_URL;
      const d = await pendente(`desiste-sem-url-${seq}`);
      portaCom(d.id, erroPermanente);
      await tick(HORA);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect((await row(d.id)).pollGaveUpAt).not.toBeNull();
    });
  });

  describe('adiamento por transporte indisponível (pollAlertedAt)', () => {
    it('webhook fora ⇒ pollAlertedAt NÃO gravado e o tick seguinte realerta; ao entregar, grava, adia 1 h e não realerta', async () => {
      const d = await pendente(`adiada-${seq}`);
      portaCom(d.id, caixaFora);
      webhookFora();

      await tick(HORA); // 1º adiamento do episódio: nada a alertar
      expect(tentativasDeAlerta('transporteAdiadoDocumentIds', d.id)).toBe(0);
      await tick(HORA); // ≥ 1 h de episódio: alerta devido, o webhook não entrega
      expect(tentativasDeAlerta('transporteAdiadoDocumentIds', d.id)).toBe(1);
      expect((await row(d.id)).pollAlertedAt).toBeNull();

      await tick(2 * MIN); // sem marcador o documento não espera 1 h: o tick seguinte realerta
      expect(tentativasDeAlerta('transporteAdiadoDocumentIds', d.id)).toBe(2);
      expect((await row(d.id)).pollAlertedAt).toBeNull();

      webhookOk();
      await tick(2 * MIN);
      expect(tentativasDeAlerta('transporteAdiadoDocumentIds', d.id)).toBe(3);
      const entregue = await row(d.id);
      expect(entregue.pollAlertedAt?.getTime()).toBe(relogio);
      expect(entregue.nextPollAt?.getTime()).toBe(relogio + HORA); // entregue ⇒ volta ao adiamento normal de 1 h
      expect(entregue.pollGaveUpAt).toBeNull(); // só alerta: nada desiste

      await tick(2 * MIN);
      await tick(HORA);
      await tick(HORA);
      expect(tentativasDeAlerta('transporteAdiadoDocumentIds', d.id)).toBe(3); // o mesmo episódio não alerta de novo
    });

    it('webhook ok ⇒ pollAlertedAt gravado no tick do alerta e um alerta só', async () => {
      const d = await pendente(`adiada-ok-${seq}`);
      portaCom(d.id, caixaFora);
      webhookOk();
      await tick(HORA);
      await tick(HORA);
      await tick(HORA);
      expect(tentativasDeAlerta('transporteAdiadoDocumentIds', d.id)).toBe(1);
      expect((await row(d.id)).pollAlertedAt).not.toBeNull();
    });
  });
});
