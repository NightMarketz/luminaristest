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
import { DfeTransporteError, type EmissaoResult } from '@/features/accounting/dfe/DfeEmissorPort';
import { enviarTentativa } from '@/features/accounting/services/dfeEnvio';

const DONO = 'u-dfe-poll-res';
const UNIT = 'unit-dfe-poll-res';
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

  it('envio com 5xx/timeout (DfeTransporteError): o documento fica SENT, NUNCA é reenviado às cegas — o polling CONSULTA pela chave', async () => {
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
