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
  POLL_IDADE_MAX_MS,
  POLL_MAX_ATTEMPTS,
  POLL_REARME_INTERVALO_MS,
} from '@/features/accounting/services/FiscalDocumentLifecycleService';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { DfeTransporteError, DfeTransporteIndisponivelError, type EmissaoResult } from '@/features/accounting/dfe/DfeEmissorPort';
import { ForbiddenError, ValidationError } from '@/lib/errors';
import { enviarTentativa } from '@/features/accounting/services/dfeEnvio';

const DONO = 'u-dfe-poll-res';
const UNIT = 'unit-dfe-poll-res';
const scope = resolveAccountingScopeInternal({ userId: DONO }, UNIT);
const repo = new FiscalDocumentRepository();

const auditoria = { append: jest.fn() };
const montarServico = (podeEmitir: boolean) =>
  new FiscalDocumentLifecycleService(
    repo,
    { getById: jest.fn(async (_s: unknown, id: string) => ({ id })) } as never,
    { upload: jest.fn(async () => ({ id: 'att' })) } as never,
    { attachSourceDocument: jest.fn(async () => ({ id: 'src' })), retireSourceDocument: jest.fn() } as never,
    { canEmitFiscalDocument: () => podeEmitir, canCancelFiscalDocument: () => true } as never,
    auditoria as never,
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
    // (ticks de 1 h: o backoff máx. é 1 h; e só 3 h depois da desistência — o re-arme automático (6 h, lacuna 3cf5) vem em outro teste)
    for (let i = 0; i < 20 && !(await row(ruim.id)).pollGaveUpAt; i += 1) await tick({ limit: 3, avanco: HORA });
    for (let i = 0; i < 3; i += 1) await tick({ limit: 3, avanco: HORA });
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
    for (let i = 0; i < 3; i += 1) await tick({ avanco: HORA }); // < 6 h: o re-arme automático (lacuna 3cf5) é de outro teste
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

  it('lacuna 6e13: a DESISTÊNCIA (erro permanente) também encerra o episódio — o documento abandonado não guarda início nem "alertado" velhos', async () => {
    const d = await pendente('episodio-desiste');
    portaCom(d.id, () => new DfeTransporteIndisponivelError('dfe_assinador_sem_dispositivo', 'caixa desligada'));
    await tick({ avanco: HORA });
    await tick({ avanco: HORA }); // 1 h de episódio ⇒ alertou
    const aberto = await row(d.id);
    expect(aberto.pollDeferredSince).not.toBeNull();
    expect(aberto.pollAlertedAt).not.toBeNull();

    // agora o erro é permanente (o schema recusa o dado): o job desiste NA 1ª vez, pelo ramo de desistência de `registrarFalhaDePoll`
    portaCom(d.id, () => {
      try {
        z.object({ x: z.string() }).parse({});
      } catch (e) {
        return e as Error;
      }
      return new Error('inalcançável');
    });
    const t = await tick({ avanco: HORA });
    expect(t.gaveUp).toBe(1);
    const fim = await row(d.id);
    expect(fim.pollGaveUpAt).not.toBeNull();
    expect(fim.pollDeferredSince).toBeNull();
    expect(fim.pollAlertedAt).toBeNull();
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

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Lacunas 3cf5/cf36/92c5 (dono 25/11, F-PD-1..5 a) — re-arme automático, teto de idade e alerta final. O relógio é injetado.
  // ---------------------------------------------------------------------------------------------------------------------------------
  const DIA = 24 * HORA;
  const em = (quando: Date) => service.pollPendingOnce(quando, { now: quando });
  const livre = (ms: number) => new Date(relogio + ms);
  /** Documento que o job já abandonou: `abandonadoEm` e idade (`createdAt` = `criadoEm`) fixados à mão; `extra` para os demais campos. */
  async function abandonado(tag: string, abandonadoEm: Date, criadoEm: Date, extra: Record<string, unknown> = {}) {
    const d = await pendente(tag);
    await prisma.fiscalDocument.update({
      where: { id: d.id },
      data: { pollAttempts: POLL_MAX_ATTEMPTS, pollGaveUpAt: abandonadoEm, pollLastError: 'sefaz_http: HTTP 503', createdAt: criadoEm, ...extra },
    });
    return d;
  }
  const permanente = () => {
    try {
      z.object({ x: z.string() }).parse({});
    } catch (e) {
      return e as Error;
    }
    return new Error('inalcançável');
  };

  it('P1.6: o intervalo do re-arme é 6 h e o teto de idade 7 dias (valores do dono, F-PD-1 a / F-PD-2 a)', () => {
    expect(POLL_REARME_INTERVALO_MS).toBe(6 * HORA);
    expect(POLL_IDADE_MAX_MS).toBe(7 * DIA);
  });

  it('P1.1: o documento abandonado só volta depois de 6 h (5 h 59 min 59 s não; 6 h sim) e uma única consulta por ciclo', async () => {
    const g = livre(0);
    const d = await abandonado('rearme-auto', g, new Date(g.getTime() - DIA));
    portaCom(d.id, () => new DfeTransporteError('sefaz_http', 'HTTP 503'));

    await em(new Date(g.getTime() + POLL_REARME_INTERVALO_MS - 1000));
    expect(chamadasDe(d.id)).toBe(0);
    const t = await em(new Date(g.getTime() + POLL_REARME_INTERVALO_MS));
    expect(chamadasDe(d.id)).toBe(1);
    expect(t.failed).toBeGreaterThanOrEqual(1);
    const r = await row(d.id);
    expect(r.pollGaveUpAt?.getTime()).toBe(g.getTime() + POLL_REARME_INTERVALO_MS); // falhou de novo: o próximo ciclo conta daqui
    expect(r.pollAttempts).toBe(POLL_MAX_ATTEMPTS + 1);
    expect(r.nextPollAt).toBeNull();
    expect(r.status).toBe('PROCESSING');
    // 1 h depois: nada; só depois de mais 6 h
    await em(new Date(g.getTime() + POLL_REARME_INTERVALO_MS + HORA));
    expect(chamadasDe(d.id)).toBe(1);
  });

  it('P1.2: 3 ciclos de re-falha NÃO contam como nova desistência (sem realerta a cada 6 h)', async () => {
    const g = livre(0);
    const d = await abandonado('rearme-sem-realerta', g, new Date(g.getTime() - DIA));
    portaCom(d.id, () => new DfeTransporteError('sefaz_http', 'HTTP 503'));
    for (let ciclo = 1; ciclo <= 3; ciclo += 1) {
      const t = await em(new Date(g.getTime() + ciclo * POLL_REARME_INTERVALO_MS));
      expect(t.gaveUpIds ?? []).not.toContain(d.id);
      expect(t.abandonoDefinitivoIds ?? []).not.toContain(d.id);
    }
    expect(chamadasDe(d.id)).toBe(3);
  });

  it('P1.1: o re-arme que dá certo limpa tudo (autoriza e zera desistência, contagem e erro)', async () => {
    const g = livre(0);
    const d = await abandonado('rearme-ok', g, new Date(g.getTime() - DIA));
    mockPort.consultar.mockImplementation(
      async (ref: string): Promise<EmissaoResult> => ({ status: 'AUTHORIZED', partnerRef: ref, chaveOuCodigo: `CH-${ref}`, numero: '1', errors: [] }),
    );
    await em(new Date(g.getTime() + POLL_REARME_INTERVALO_MS));
    const r = await row(d.id);
    expect(r.status).toBe('AUTHORIZED');
    expect(r.pollGaveUpAt).toBeNull();
    expect(r.pollAttempts).toBe(0);
    expect(r.pollLastError).toBeNull();
  });

  it('P1.1: o re-arme respeita `nextPollAt` (re-armado empurrado pelo transporte indisponível não volta a cada tick) e NÃO abre episódio de adiamento', async () => {
    const g = livre(0);
    const d = await abandonado('rearme-transporte', g, new Date(g.getTime() - DIA));
    portaCom(d.id, () => new DfeTransporteIndisponivelError('dfe_assinador_sem_dispositivo', 'caixa desligada'));
    const t0 = new Date(g.getTime() + POLL_REARME_INTERVALO_MS);
    await em(t0);
    expect(chamadasDe(d.id)).toBe(1);
    const r = await row(d.id);
    expect(r.nextPollAt?.getTime()).toBe(t0.getTime() + HORA); // adiado 1 h
    expect(r.pollGaveUpAt?.getTime()).toBe(g.getTime()); // segue abandonado: o adiamento não o re-arma de verdade
    expect(r.pollDeferredSince).toBeNull(); // sem episódio: `pollAlertedAt` ali significa "alerta final" (F-PD-5 a)
    expect(r.pollAlertedAt).toBeNull();
    expect(r.pollAttempts).toBe(POLL_MAX_ATTEMPTS); // sem gastar tentativa
    await em(new Date(t0.getTime() + HORA - 1000));
    expect(chamadasDe(d.id)).toBe(1); // ainda dentro do adiamento
    await em(new Date(t0.getTime() + HORA));
    expect(chamadasDe(d.id)).toBe(2);
  });

  it('P1.1/P1.3: a idade manda — com 7 dias menos 1 ms ainda re-arma; com exatamente 7 dias o job para e alerta UMA vez (F-PD-2 a, F-PD-5 a)', async () => {
    const agora = livre(0);
    const jovem = await abandonado('idade-jovem', new Date(agora.getTime() - 7 * HORA), new Date(agora.getTime() - POLL_IDADE_MAX_MS + 1));
    const velho = await abandonado('idade-teto', new Date(agora.getTime() - 7 * HORA), new Date(agora.getTime() - POLL_IDADE_MAX_MS));
    mockPort.consultar.mockImplementation(async (ref: string): Promise<EmissaoResult> => {
      throw new DfeTransporteError('sefaz_http', `HTTP 503 ${ref}`);
    });

    const t = await em(agora);
    expect(chamadasDe(jovem.id)).toBe(1); // re-armado
    expect(chamadasDe(velho.id)).toBe(0); // acima do teto: nunca mais re-armado
    expect(t.abandonoDefinitivoIds).toContain(velho.id);
    expect(t.abandonoDefinitivoIds).not.toContain(jovem.id);
    expect((await row(velho.id)).pollAlertedAt?.getTime()).toBe(agora.getTime()); // F-PD-5 a: "o alerta final saiu"

    const t2 = await em(new Date(agora.getTime() + POLL_REARME_INTERVALO_MS));
    expect(t2.abandonoDefinitivoIds ?? []).not.toContain(velho.id); // dois ticks seguidos além do teto = 1 alerta
    expect(chamadasDe(velho.id)).toBe(0);
    expect((await row(velho.id)).status).toBe('PROCESSING'); // o status nunca muda
  });

  it('P1.4/F-PD-5: o re-arme MANUAL de quem já teve o alerta final zera a marca, volta ao polling normal e audita `dfe.poll_rearmed` (sem PII)', async () => {
    const agora = livre(0);
    const abandonadoEm = new Date(agora.getTime() - 7 * HORA);
    const d = await abandonado('rearme-manual-pos-alerta', abandonadoEm, new Date(agora.getTime() - 8 * DIA));
    await em(agora);
    expect((await row(d.id)).pollAlertedAt).not.toBeNull();

    auditoria.append.mockClear();
    await service.rearmarPoll(scope, d.id);
    const r = await row(d.id);
    expect(r.pollGaveUpAt).toBeNull();
    expect(r.pollAlertedAt).toBeNull();
    expect(r.pollAttempts).toBe(0);
    expect(auditoria.append).toHaveBeenCalledTimes(1);
    expect(auditoria.append).toHaveBeenCalledWith(
      expect.anything(),
      scope,
      expect.objectContaining({
        eventType: 'dfe.poll_rearmed',
        targetType: 'fiscal_document',
        targetId: d.id,
        payload: { documentId: d.id, unitId: UNIT, gaveUpAt: abandonadoEm.toISOString() },
      }),
    );

    // o ciclo recomeça: volta à fila normal (mesmo com a idade acima do teto)
    portaCom(d.id, () => new DfeTransporteError('sefaz_http', 'HTTP 503'));
    await em(new Date(agora.getTime() + HORA));
    expect(chamadasDe(d.id)).toBe(1);
  });

  it('P1.4: re-arme que não muda nada (sem permissão, ou documento não abandonado) NÃO audita', async () => {
    const naoAbandonado = await pendente('rearme-sem-audit');
    auditoria.append.mockClear();
    await service.rearmarPoll(scope, naoAbandonado.id);
    await expect(montarServico(false).rearmarPoll(scope, naoAbandonado.id)).rejects.toBeInstanceOf(ForbiddenError);
    expect(auditoria.append).not.toHaveBeenCalled();
  });

  it('P1.3: nota terminal (AUTHORIZED por outro caminho) com `pollGaveUpAt` velho não gera alerta final (lacuna 153d)', async () => {
    const agora = livre(0);
    const d = await abandonado('terminal-velha', new Date(agora.getTime() - 7 * HORA), new Date(agora.getTime() - 9 * DIA), { status: 'AUTHORIZED' });
    const t = await em(agora);
    expect(t.abandonoDefinitivoIds ?? []).not.toContain(d.id);
    expect((await row(d.id)).pollAlertedAt).toBeNull();
  });

  it('P1.3: documento que desiste JÁ além do teto de idade emite o alerta final UMA vez (não gaveUp + abandono)', async () => {
    const d = await pendente('desiste-velho');
    await prisma.fiscalDocument.update({ where: { id: d.id }, data: { createdAt: new Date(relogio - 8 * DIA) } });
    portaCom(d.id, permanente);
    const t = await tick();
    expect(t.abandonoDefinitivoIds).toContain(d.id);
    expect(t.gaveUpIds ?? []).not.toContain(d.id);
    const r = await row(d.id);
    expect(r.pollGaveUpAt).not.toBeNull();
    expect(r.pollAlertedAt).not.toBeNull();
    const t2 = await tick();
    expect(t2.abandonoDefinitivoIds ?? []).not.toContain(d.id); // o varredor não repete: a marca já foi gravada
    expect(t2.gaveUpIds ?? []).not.toContain(d.id);
  });

  it('P1.5 (92c5, F-PD-3 a): adiado por transporte há 7 dias menos 1 ms segue adiado; com 7 dias o job desiste e emite UM alerta final', async () => {
    const d = await pendente('adiado-teto');
    const inicio = livre(0);
    portaCom(d.id, () => new DfeTransporteIndisponivelError('dfe_assinador_sem_dispositivo', 'caixa desligada'));
    await prisma.fiscalDocument.update({
      where: { id: d.id },
      data: { createdAt: new Date(inicio.getTime() - DIA), pollDeferredSince: inicio, pollAlertedAt: new Date(inicio.getTime() + HORA), nextPollAt: null },
    });

    const quase = await em(new Date(inicio.getTime() + POLL_IDADE_MAX_MS - 1));
    expect(chamadasDe(d.id)).toBe(1);
    expect(quase.abandonoDefinitivoIds ?? []).not.toContain(d.id);
    let r = await row(d.id);
    expect(r.pollGaveUpAt).toBeNull();
    expect(r.pollDeferredSince?.getTime()).toBe(inicio.getTime());

    await prisma.fiscalDocument.update({ where: { id: d.id }, data: { nextPollAt: null } });
    const fim = new Date(inicio.getTime() + POLL_IDADE_MAX_MS);
    const t = await em(fim);
    expect(t.abandonoDefinitivoIds).toContain(d.id);
    expect(t.transporteAdiadoIds ?? []).not.toContain(d.id);
    r = await row(d.id);
    expect(r.pollGaveUpAt?.getTime()).toBe(fim.getTime());
    expect(r.pollDeferredSince).toBeNull();
    expect(r.pollAlertedAt?.getTime()).toBe(fim.getTime());
    expect(r.nextPollAt).toBeNull();
    expect(r.pollAttempts).toBe(0); // adiar nunca gastou tentativa
    expect(r.status).toBe('PROCESSING');

    // ticks seguintes (idade já ≥ 7 dias): nenhum 2º alerta, nenhuma consulta nova
    const consultas = chamadasDe(d.id);
    const depois = await em(new Date(fim.getTime() + POLL_REARME_INTERVALO_MS));
    expect(depois.abandonoDefinitivoIds ?? []).not.toContain(d.id);
    expect(chamadasDe(d.id)).toBe(consultas);
  });

  // Revisão independente do #1409 — guardas de estado (compare-and-set) e filtros do repositório.
  it('revisão #1409 (A): re-arme manual ENTRE a listagem e a gravação do alerta final — nenhum alerta falso e `pollAlertedAt` não sobra', async () => {
    const agora = livre(0);
    const d = await abandonado('corrida-alerta', new Date(agora.getTime() - 7 * HORA), new Date(agora.getTime() - 8 * DIA));
    const original = repo.listAbandonoDefinitivo.bind(repo);
    const espiao = jest.spyOn(repo, 'listAbandonoDefinitivo').mockImplementationOnce(async (...args) => {
      const docs = await original(...args);
      await service.rearmarPoll(scope, d.id); // o operador re-arma depois de o job listar o documento
      return docs;
    });
    try {
      const t = await em(agora);
      expect(t.abandonoDefinitivoIds ?? []).not.toContain(d.id);
    } finally {
      espiao.mockRestore();
    }
    const r = await row(d.id);
    expect(r.pollGaveUpAt).toBeNull();
    expect(r.pollAlertedAt).toBeNull(); // sem marca sobrando para suprimir o alerta de 1 h de um episódio futuro
  });

  it('revisão #1409 (B): re-arme manual DURANTE a consulta do re-armado automático — a falha seguinte não desfaz o re-arme', async () => {
    const g = livre(0);
    const d = await abandonado('corrida-rearme', g, new Date(g.getTime() - DIA));
    mockPort.consultar.mockImplementation(async (ref: string): Promise<EmissaoResult> => {
      if (ref.startsWith(d.id)) {
        await service.rearmarPoll(scope, d.id); // o operador clica enquanto a consulta de rede está em voo
        throw new DfeTransporteError('sefaz_http', 'HTTP 503');
      }
      return { status: 'AUTHORIZED', partnerRef: ref, chaveOuCodigo: `CH-${ref}`, numero: '1', errors: [] };
    });
    const t = await em(new Date(g.getTime() + POLL_REARME_INTERVALO_MS));
    expect(t.gaveUpIds ?? []).not.toContain(d.id);
    const r = await row(d.id);
    expect(r.pollGaveUpAt).toBeNull(); // o re-arme manual vence a escrita velha do tick
    expect(r.pollAttempts).toBe(0);
  });

  it('revisão #1409: re-arme duplo (clique repetido) audita UMA vez — o segundo não encontra mais nada abandonado', async () => {
    const g = livre(0);
    const d = await abandonado('rearme-duplo', g, new Date(g.getTime() - DIA));
    auditoria.append.mockClear();
    await Promise.all([service.rearmarPoll(scope, d.id), service.rearmarPoll(scope, d.id)]);
    expect(auditoria.append).toHaveBeenCalledTimes(1);
  });

  it('revisão #1409: o alerta final e o re-arme ignoram documento apagado (soft-delete) e do modo manual', async () => {
    const agora = livre(0);
    const velho = new Date(agora.getTime() - 8 * DIA);
    const quando = new Date(agora.getTime() - 7 * HORA);
    const apagado = await abandonado('velho-apagado', quando, velho, { deletedAt: new Date() });
    const manual = await abandonado('velho-manual', quando, velho, { partner: 'manual' });
    const jovemApagado = await abandonado('jovem-apagado', new Date(agora.getTime() - 7 * HORA), new Date(agora.getTime() - DIA), { deletedAt: new Date() });
    const jovemManual = await abandonado('jovem-manual', new Date(agora.getTime() - 7 * HORA), new Date(agora.getTime() - DIA), { partner: 'manual' });
    mockPort.consultar.mockImplementation(async (ref: string): Promise<EmissaoResult> => {
      throw new DfeTransporteError('sefaz_http', `HTTP 503 ${ref}`);
    });
    const t = await em(agora);
    for (const x of [apagado, manual]) expect(t.abandonoDefinitivoIds ?? []).not.toContain(x.id);
    for (const x of [jovemApagado, jovemManual]) expect(chamadasDe(x.id)).toBe(0);
    for (const x of [apagado, manual]) expect((await row(x.id)).pollAlertedAt).toBeNull();
  });

  it('revisão #1409: falha ao gravar a marca do alerta final não derruba o tick nem perde o alerta — o próximo tick tenta de novo', async () => {
    const agora = livre(0);
    const d = await abandonado('marca-falha', new Date(agora.getTime() - 7 * HORA), new Date(agora.getTime() - 8 * DIA));
    const original = repo.updatePollState.bind(repo);
    const espiao = jest.spyOn(repo, 'updatePollState').mockImplementation(async (...args) => {
      if (args[0] && args[1] === d.id) throw new Error('disco cheio');
      return original(...args);
    });
    try {
      const t = await em(agora);
      expect(t.abandonoDefinitivoIds ?? []).not.toContain(d.id);
    } finally {
      espiao.mockRestore();
    }
    expect((await row(d.id)).pollAlertedAt).toBeNull();
    const t2 = await em(new Date(agora.getTime() + HORA));
    expect(t2.abandonoDefinitivoIds).toContain(d.id);
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
