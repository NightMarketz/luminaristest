/**
 * Onda 4 / 4.1 (auditoria fiscal/contábil de 24/11/2026) — o polling de SENT|PROCESSING não repete para sempre o
 * documento que falha, e esse documento não trava os outros (sem head-of-line). Serviço e repositório reais em SQLite.
 *
 * Antes: `listPending` sem `limit`, falha transitória contava `failed++` sem backoff nem teto — o MESMO documento era
 * consultado a cada tick, indefinidamente. Depois: `limit` por tick, `pollAttempts` + `nextPollAt` (backoff exponencial),
 * teto ⇒ `pollGaveUpAt` + alerta; o status do documento NÃO muda (REJECTED liberaria o reenvio sem a SEFAZ ter dito que
 * não recebeu — MOC 7.0 VG §5.1.6).
 *
 * `now` é injetado: o backoff é provado sem esperar.
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
import {
  FiscalDocumentLifecycleService,
  POLL_MAX_ATTEMPTS,
} from '@/features/accounting/services/FiscalDocumentLifecycleService';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { DfeTransporteError, DfeTransporteIndisponivelError, type EmissaoResult } from '@/features/accounting/dfe/DfeEmissorPort';
import { ForbiddenError, ValidationError } from '@/lib/errors';
import { enviarTentativa } from '@/features/accounting/services/dfeEnvio';

const DONO = 'u-dfe-poll-res';
const UNIT = 'unit-dfe-poll-res';
const scope = resolveAccountingScopeInternal({ userId: DONO }, UNIT);
const repo = new FiscalDocumentRepository();

const montarServico = (podeEmitir: boolean) =>
  new FiscalDocumentLifecycleService(
    repo,
    { getById: jest.fn(async (_s: unknown, id: string) => ({ id })) } as never,
    { upload: jest.fn(async () => ({ id: 'att' })) } as never,
    { attachSourceDocument: jest.fn(async () => ({ id: 'src' })), retireSourceDocument: jest.fn() } as never,
    { canEmitFiscalDocument: () => podeEmitir, canCancelFiscalDocument: () => true } as never,
    { append: jest.fn() } as never,
    { findOverlapping: async () => [] } as never,
  );
const service = montarServico(true);

let seq = 0;
async function pendente(tag: string) {
  seq += 1;
  const doc = await repo.createSent(scope, {
    kind: 'NFSE',
    saleId: `sale-${tag}`,
    cTribNac: '060101',
    anchorEntryId: 'entry-x',
    ambiente: 'homologacao',
    partner: 'null',
    serie: 1,
    numero: BigInt(seq),
    dCompet: '2026-10-07',
    vServCents: 10000n,
    tpRetISSQN: 1,
    payloadJson: '{"v":1}',
  });
  await repo.transition(scope, doc.id, { status: 'PROCESSING' });
  return doc;
}

async function prepararEnvio(tag: string) {
  const d = await pendente(tag);
  await repo.transition(scope, d.id, { status: 'SENT' });
  return row(d.id);
}

const row = (id: string) => prisma.fiscalDocument.findUniqueOrThrow({ where: { id } });
const HORA = 3_600_000;
let relogio = Date.now() + 10 * HORA;
/** Cada tick avança o relógio simulado além de qualquer backoff (o teto do backoff é 1 h). */
const tick = async (opts: { limit?: number; avanco?: number } = {}) => {
  relogio += opts.avanco ?? 2 * HORA;
  const now = new Date(relogio);
  return service.pollPendingOnce(now, { limit: opts.limit, now });
};

/** O documento "ruim" falha de um jeito; os demais autorizam. */
function portaCom(ruim: string, falha: () => Error) {
  mockPort.consultar.mockImplementation(async (ref: string): Promise<EmissaoResult> => {
    if (ref.startsWith(ruim)) throw falha();
    return { status: 'AUTHORIZED', partnerRef: ref, chaveOuCodigo: `CH-${ref}`, numero: '1', errors: [] };
  });
}
const chamadasDe = (ruim: string) => mockPort.consultar.mock.calls.filter((c) => String(c[0]).startsWith(ruim)).length;

describe('Onda 4 / 4.1 — polling de DF-e: teto, backoff e sem head-of-line (SQLite real)', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({ data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' } });
  }, 120000);
  beforeEach(() => mockPort.consultar.mockReset());
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1 documento permanentemente falho + 5 sadios: os sadios autorizam no 1º tick e o falho PARA no teto', async () => {
    const ruim = await pendente('ruim'); // o mais antigo: seria o primeiro da fila (head-of-line)
    const sadios = [];
    for (let i = 0; i < 5; i += 1) sadios.push(await pendente(`ok-${i}`));
    portaCom(ruim.id, () => new DfeTransporteError('sefaz_http', 'HTTP 503'));

    // 1º tick com limit 3: o falho ocupa 1 vaga e NÃO impede os outros de andar nos ticks seguintes
    const t1 = await tick({ limit: 3 });
    expect(t1.failed).toBe(1);
    const t2 = await tick({ limit: 3 });
    expect(t2.total).toBeGreaterThan(0);
    for (let i = 0; i < 3; i += 1) await tick({ limit: 3 });
    for (const d of sadios) expect((await row(d.id)).status).toBe('AUTHORIZED');

    // só o falho sobra; roda além do teto: a quantidade de consultas é exatamente o teto e não passa disso
    for (let i = 0; i < POLL_MAX_ATTEMPTS + 5; i += 1) await tick({ limit: 3 });
    expect(chamadasDe(ruim.id)).toBe(POLL_MAX_ATTEMPTS);
    const r = await row(ruim.id);
    expect(r.status).toBe('PROCESSING'); // NUNCA REJECTED: a SEFAZ não disse que não recebeu
    expect(r.pollGaveUpAt).not.toBeNull();
    expect(r.pollAttempts).toBe(POLL_MAX_ATTEMPTS);
    expect(r.pollLastError).toContain('sefaz_http');
  });

  it('backoff: falhou agora ⇒ o tick seguinte (mesmo relógio) NÃO reconsulta; depois do backoff, sim', async () => {
    const ruim = await pendente('backoff');
    portaCom(ruim.id, () => new DfeTransporteError('sefaz_timeout', 'conexão'));
    const base = Date.now() + 100 * HORA;
    const a = await service.pollPendingOnce(new Date(base), { now: new Date(base) });
    expect(a.failed).toBe(1);
    expect(chamadasDe(ruim.id)).toBe(1);
    const aposFalha = await row(ruim.id);
    expect(aposFalha.nextPollAt!.getTime()).toBeGreaterThan(base); // relógio próprio do backoff

    await service.pollPendingOnce(new Date(base + 1000), { now: new Date(base + 1000) });
    expect(chamadasDe(ruim.id)).toBe(1); // ainda em backoff

    const depois = base + 2 * HORA;
    await service.pollPendingOnce(new Date(depois), { now: new Date(depois) });
    expect(chamadasDe(ruim.id)).toBe(2);
    expect((await row(ruim.id)).pollAttempts).toBe(2);
  });

  it('erro permanente (payload recusado pelo schema) desiste na 1ª vez, sem repetir', async () => {
    const ruim = await pendente('schema');
    portaCom(ruim.id, () => {
      try {
        z.object({ x: z.string() }).parse({});
      } catch (e) {
        return e as Error;
      }
      return new Error('inalcançável');
    });
    const t = await tick();
    expect(t.gaveUp).toBe(1);
    for (let i = 0; i < 3; i += 1) await tick();
    expect(chamadasDe(ruim.id)).toBe(1);
    const r = await row(ruim.id);
    expect(r.pollGaveUpAt).not.toBeNull();
    expect(r.status).toBe('PROCESSING');
  });

  it('o sucesso zera a contagem (falha transitória que se resolve não envelhece o documento)', async () => {
    const d = await pendente('recupera');
    mockPort.consultar.mockRejectedValueOnce(new DfeTransporteError('sefaz_http', 'HTTP 502'));
    mockPort.consultar.mockResolvedValue({ status: 'PROCESSING', partnerRef: `${d.id}:1`, errors: [] } as EmissaoResult);
    await tick();
    expect((await row(d.id)).pollAttempts).toBe(1);
    await tick();
    const r = await row(d.id);
    expect(r.pollAttempts).toBe(0);
    expect(r.nextPollAt).toBeNull();
    expect(r.pollGaveUpAt).toBeNull();
  });

  it('envio com 5xx/timeout (DfeTransporteError): o documento fica SENT, NUNCA é reenviado às cegas — o polling CONSULTA (consultar, não emitir)', async () => {
    const d = await prepararEnvio('envio-5xx');
    const emitir = jest.fn(async () => {
      throw new DfeTransporteError('sefaz_http', 'HTTP 503');
    });
    await enviarTentativa(
      repo,
      null,
      scope,
      d,
      { ...mockPort, emitir } as never,
      { kind: 'NFSE', payload: {}, ref: `${d.id}:1` } as never,
      'dfe_envio_falhou',
    );
    expect((await row(d.id)).status).toBe('SENT');
    expect(emitir).toHaveBeenCalledTimes(1);

    mockPort.consultar.mockResolvedValue({ status: 'AUTHORIZED', partnerRef: `${d.id}:1`, chaveOuCodigo: 'CH-1', numero: '1', errors: [] } as EmissaoResult);
    await tick();
    expect(chamadasDe(d.id)).toBe(1); // reconsultou este documento (os outros do banco compartilhado não contam)
    expect(emitir).toHaveBeenCalledTimes(1); // e não reenviou
    expect((await row(d.id)).status).toBe('AUTHORIZED');
  });

  it('transporte indisponível (assinador local fora): ~3 h de ticks NÃO gastam tentativa nem desistem; ao voltar, o documento autoriza (L-…580f)', async () => {
    const d = await pendente('assinador-fora');
    portaCom(d.id, () => new DfeTransporteIndisponivelError('dfe_assinador_sem_dispositivo', 'caixa desligada'));
    // 10 ticks de 1 h simuladas (o teto de tentativas de uma falha comum é 8; o relógio é injetado, nada espera)
    for (let i = 0; i < POLL_MAX_ATTEMPTS + 2; i += 1) {
      const t = await tick({ avanco: HORA });
      expect(t.gaveUp ?? 0).toBe(0);
    }
    const fora = await row(d.id);
    expect(fora.pollGaveUpAt).toBeNull();
    expect(fora.pollAttempts).toBe(0);
    expect(fora.status).toBe('PROCESSING');
    expect(fora.nextPollAt).not.toBeNull(); // adiado, não esquecido

    // contagem que já existia fica: adiar não reinicia o backoff
    const d2 = await pendente('assinador-fora-2');
    portaCom(d2.id, () => new DfeTransporteError('sefaz_http', 'HTTP 503'));
    await tick();
    expect((await row(d2.id)).pollAttempts).toBe(1);
    portaCom(d2.id, () => new DfeTransporteIndisponivelError('dfe_assinador_sem_dispositivo', 'caixa desligada'));
    await tick();
    expect((await row(d2.id)).pollAttempts).toBe(1);

    // a caixa volta: ambos autorizam
    mockPort.consultar.mockImplementation(
      async (ref: string): Promise<EmissaoResult> => ({ status: 'AUTHORIZED', partnerRef: ref, chaveOuCodigo: `CH-${ref}`, numero: '1', errors: [] }),
    );
    await tick();
    expect((await row(d.id)).status).toBe('AUTHORIZED');
    expect((await row(d2.id)).status).toBe('AUTHORIZED');
  });

  it('lacuna 92c5 (dono 24/11): transporte indisponível — adiada há <1 h NÃO alerta; ≥1 h alerta UMA vez (não a cada tick); segue adiada, sem teto nem desistência', async () => {
    const d = await pendente('adiada-alerta');
    portaCom(d.id, () => new DfeTransporteIndisponivelError('dfe_assinador_sem_dispositivo', 'caixa desligada'));
    const alertou = (t: Awaited<ReturnType<typeof tick>>) => (t.transporteAdiadoIds ?? []).includes(d.id);

    // 1º adiamento do episódio: adiada há 0 (o documento é mais velho que 1 h pelo relógio simulado, mas "adiada há" conta
    // do primeiro adiamento, não da idade da nota).
    expect(alertou(await tick({ avanco: HORA }))).toBe(false);
    // 30 min depois: o documento nem volta à fila (nextPollAt = +1 h) — nada consulta, nada alerta.
    const antes = chamadasDe(d.id);
    expect(alertou(await tick({ avanco: HORA / 2 }))).toBe(false);
    expect(chamadasDe(d.id)).toBe(antes);
    // 1 h desde o 1º adiamento e transporte ainda fora ⇒ alerta, com o id da nota.
    const t = await tick({ avanco: HORA / 2 });
    expect(alertou(t)).toBe(true);
    expect(t.transporteAdiadoAlerta).toBeGreaterThanOrEqual(1);
    // ticks seguintes (2 h, 3 h adiada): o MESMO episódio não alerta de novo.
    expect(alertou(await tick({ avanco: HORA }))).toBe(false);
    expect(alertou(await tick({ avanco: HORA }))).toBe(false);

    // só alerta: a nota segue PROCESSING, sem tentativa gasta, sem desistência.
    const fora = await row(d.id);
    expect(fora.status).toBe('PROCESSING');
    expect(fora.pollAttempts).toBe(0);
    expect(fora.pollGaveUpAt).toBeNull();
    expect(fora.nextPollAt).not.toBeNull();

    // a caixa volta: autoriza e o controle do episódio é limpo (um episódio futuro alertaria de novo).
    mockPort.consultar.mockImplementation(
      async (ref: string): Promise<EmissaoResult> => ({ status: 'AUTHORIZED', partnerRef: ref, chaveOuCodigo: `CH-${ref}`, numero: '1', errors: [] }),
    );
    await tick({ avanco: HORA });
    const ok = await row(d.id);
    expect(ok.status).toBe('AUTHORIZED');
    expect(ok.pollLastError).toBeNull();
  });

  it('lacuna 6e13 (dono 25/11): o episódio de adiamento mora em colunas próprias (início e "alertado"); pollLastError é só a mensagem', async () => {
    const d = await pendente('colunas-episodio');
    portaCom(d.id, () => new DfeTransporteIndisponivelError('dfe_assinador_sem_dispositivo', 'caixa desligada'));
    await tick({ avanco: HORA });
    const inicio = relogio;
    const a = await row(d.id);
    expect(a.pollLastError).toBe('dfe_assinador_sem_dispositivo: caixa desligada');
    expect(a.pollDeferredSince?.getTime()).toBe(inicio);
    expect(a.pollAlertedAt).toBeNull();

    // 1 h depois: alerta. O início do episódio NÃO anda; o "alertei" leva o relógio do tick; a mensagem segue pura.
    const t = await tick({ avanco: HORA });
    expect(t.transporteAdiadoIds ?? []).toContain(d.id);
    const b = await row(d.id);
    expect(b.pollDeferredSince?.getTime()).toBe(inicio);
    expect(b.pollAlertedAt?.getTime()).toBe(relogio);
    expect(b.pollLastError).toBe('dfe_assinador_sem_dispositivo: caixa desligada');

    // a caixa volta: o controle do episódio inteiro é limpo
    mockPort.consultar.mockImplementation(
      async (ref: string): Promise<EmissaoResult> => ({ status: 'AUTHORIZED', partnerRef: ref, chaveOuCodigo: `CH-${ref}`, numero: '1', errors: [] }),
    );
    await tick({ avanco: HORA });
    const c = await row(d.id);
    expect(c.status).toBe('AUTHORIZED');
    expect(c.pollDeferredSince).toBeNull();
    expect(c.pollAlertedAt).toBeNull();
    expect(c.pollLastError).toBeNull();
  });

  it('lacuna 6e13: OUTRA falha encerra o episódio (zera início e "alertado") — a queda seguinte começa do zero, sem alerta imediato', async () => {
    const d = await pendente('episodio-encerra');
    const alertou = (t: Awaited<ReturnType<typeof tick>>) => (t.transporteAdiadoIds ?? []).includes(d.id);
    const fora = () => portaCom(d.id, () => new DfeTransporteIndisponivelError('dfe_assinador_sem_dispositivo', 'caixa desligada'));
    fora();
    await tick({ avanco: HORA });
    expect(alertou(await tick({ avanco: HORA }))).toBe(true); // episódio 1 já alertou

    portaCom(d.id, () => new DfeTransporteError('sefaz_http', 'HTTP 503'));
    await tick({ avanco: HORA });
    const meio = await row(d.id);
    expect(meio.pollAttempts).toBe(1);
    expect(meio.pollDeferredSince).toBeNull();
    expect(meio.pollAlertedAt).toBeNull();

    // episódio 2: o 1º adiamento NÃO alerta (nem herda o "alertado" nem o início do episódio 1) e abre um início novo
    fora();
    expect(alertou(await tick({ avanco: HORA }))).toBe(false);
    expect((await row(d.id)).pollDeferredSince?.getTime()).toBe(relogio);
    expect((await row(d.id)).pollAlertedAt).toBeNull();
  });

  it('lacuna ff2f: a janela de 1 h do alerta — sondada com o documento de volta à fila ANTES de 1 h (nextPollAt zerado à mão): 30 min e 1 h−1 ms não alertam; 1 h alerta', async () => {
    const d = await pendente('janela-1h');
    portaCom(d.id, () => new DfeTransporteIndisponivelError('dfe_assinador_sem_dispositivo', 'caixa desligada'));
    await tick({ avanco: HORA });
    const inicio = relogio;
    // Sem este atalho o documento só volta à fila depois de POLL_ADIAR_MS (1 h) e qualquer limiar ≤ 1 h parece igual.
    const sondar = async (apos: number) => {
      await prisma.fiscalDocument.update({ where: { id: d.id }, data: { nextPollAt: null } });
      relogio = inicio + apos;
      const now = new Date(relogio);
      return ((await service.pollPendingOnce(now, { now })).transporteAdiadoIds ?? []).includes(d.id);
    };
    expect(await sondar(HORA / 2)).toBe(false);
    expect(await sondar(HORA - 1)).toBe(false);
    expect(await sondar(HORA)).toBe(true);
  });

  it('lacunas cf36/3cf5 (dono 25/11): re-arme explícito zera desistência, tentativas e backoff; o status não muda; o job volta a consultar', async () => {
    const d = await pendente('rearme');
    portaCom(d.id, () => new DfeTransporteError('sefaz_http', 'HTTP 503'));
    for (let i = 0; i < POLL_MAX_ATTEMPTS + 1; i += 1) await tick();
    const abandonado = await row(d.id);
    expect(abandonado.pollGaveUpAt).not.toBeNull();
    expect(abandonado.pollAttempts).toBe(POLL_MAX_ATTEMPTS);
    const chamadas = chamadasDe(d.id);
    await tick();
    expect(chamadasDe(d.id)).toBe(chamadas); // abandonado: o job não consulta

    const view = await service.rearmarPoll(scope, d.id);
    expect(view).toEqual({ id: d.id });
    const r = await row(d.id);
    expect(r.pollGaveUpAt).toBeNull();
    expect(r.pollAttempts).toBe(0);
    expect(r.nextPollAt).toBeNull();
    expect(r.status).toBe('PROCESSING'); // re-armar nunca decide o destino da nota

    await tick();
    expect(chamadasDe(d.id)).toBe(chamadas + 1); // o job voltou a consultá-lo
  });

  it('re-arme de documento que o job NÃO abandonou não grava nada (devolve a view atual)', async () => {
    const d = await pendente('rearme-noop');
    portaCom(d.id, () => new DfeTransporteError('sefaz_http', 'HTTP 503'));
    await tick();
    const antes = await row(d.id);
    expect(antes.pollAttempts).toBe(1);
    expect(antes.pollGaveUpAt).toBeNull();

    expect(await service.rearmarPoll(scope, d.id)).toEqual({ id: d.id });
    const depois = await row(d.id);
    expect(depois.pollAttempts).toBe(1); // o contador de uma falha em andamento fica
    expect(depois.nextPollAt?.getTime()).toBe(antes.nextPollAt?.getTime());
  });

  it('re-arme: sem permissão ⇒ 403 sem gravar; documento inexistente ou de outro escopo ⇒ não encontrado', async () => {
    const d = await pendente('rearme-guardas');
    portaCom(d.id, () => new DfeTransporteError('sefaz_http', 'HTTP 503'));
    for (let i = 0; i < POLL_MAX_ATTEMPTS + 1; i += 1) await tick();
    expect((await row(d.id)).pollGaveUpAt).not.toBeNull();

    await expect(montarServico(false).rearmarPoll(scope, d.id)).rejects.toBeInstanceOf(ForbiddenError);
    expect((await row(d.id)).pollGaveUpAt).not.toBeNull();

    await expect(service.rearmarPoll(scope, 'nao-existe')).rejects.toBeInstanceOf(ValidationError);
    const outro = resolveAccountingScopeInternal({ userId: 'u-outro-dono' }, 'unit-outro');
    await expect(service.rearmarPoll(outro, d.id)).rejects.toBeInstanceOf(ValidationError);
    expect((await row(d.id)).pollGaveUpAt).not.toBeNull();
  });

  it('consulta manual (consultarUm) de documento que o job abandonou: se der certo, volta ao polling', async () => {
    const d = await pendente('manual-volta');
    portaCom(d.id, () => new DfeTransporteError('sefaz_http', 'HTTP 503'));
    for (let i = 0; i < POLL_MAX_ATTEMPTS + 1; i += 1) await tick();
    expect((await row(d.id)).pollGaveUpAt).not.toBeNull();

    mockPort.consultar.mockReset();
    mockPort.consultar.mockResolvedValue({ status: 'PROCESSING', partnerRef: `${d.id}:1`, errors: [] } as EmissaoResult);
    await service.consultarUm(scope, d.id);
    const r = await row(d.id);
    expect(r.pollGaveUpAt).toBeNull();
    expect(r.pollAttempts).toBe(0);
  });
});
