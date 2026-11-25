/**
 * L-20261124-054021-cbc8 / ressalva do #1358 — uso denegado (cStat 110/301/302) gravado em SQLite REAL: a porta devolve
 * `DENIED` (o cStat → DENIED é provado em `SefazNfeEmissor.test.ts`; aqui a perna de PERSISTÊNCIA e do ciclo), o serviço e o
 * repositório são os reais. Prova: o status `DENIED` é gravado, é terminal (o polling não volta a consultar), não é reenviável
 * (≠ REJECTED), o `errorsJson` leva o código e a auditoria sai como `dfe.denied` (nunca `dfe.rejected`).
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

import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { FiscalDocumentRepository } from '@/features/accounting/repositories/FiscalDocumentRepository';
import { FiscalDocumentLifecycleService } from '@/features/accounting/services/FiscalDocumentLifecycleService';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import type { EmissaoResult } from '@/features/accounting/dfe/DfeEmissorPort';

const DONO = 'u-dfe-denied';
const UNIT = 'unit-dfe-denied';
const scope = resolveAccountingScopeInternal({ userId: DONO }, UNIT);
const repo = new FiscalDocumentRepository();
const append = jest.fn();

const service = new FiscalDocumentLifecycleService(
  repo,
  { getById: jest.fn(async (_s: unknown, id: string) => ({ id })) } as never,
  { upload: jest.fn(async () => ({ id: 'att' })) } as never,
  { attachSourceDocument: jest.fn(async () => ({ id: 'src' })), retireSourceDocument: jest.fn() } as never,
  { canEmitFiscalDocument: () => true, canCancelFiscalDocument: () => true } as never,
  { append } as never,
  { findOverlapping: async () => [] } as never,
);

let seq = 0;
async function pendente(status: 'SENT' | 'PROCESSING' = 'PROCESSING') {
  seq += 1;
  const doc = await repo.createSent(scope, {
    kind: 'NFCE',
    saleId: `sale-denied-${seq}`,
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
  if (status === 'SENT') await repo.transition(scope, doc.id, { status: 'SENT' });
  return doc;
}
const row = (id: string) => prisma.fiscalDocument.findUniqueOrThrow({ where: { id } });
const HORA = 3_600_000;
let relogio = Date.now() + 10 * HORA;
const tick = () => {
  relogio += 2 * HORA;
  const now = new Date(relogio);
  return service.pollPendingOnce(now);
};
const chamadasDe = (id: string) => mockPort.consultar.mock.calls.filter((c) => String(c[0]).startsWith(id)).length;

describe('DENIED (uso denegado) — gravado em SQLite real, terminal, sem retry (L-…cbc8)', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({ data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' } });
  }, 120000);
  beforeEach(() => {
    mockPort.consultar.mockReset();
    append.mockReset();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it.each(['110', '301', '302'])('consulta devolve cStat %s ⇒ DENIED gravado com o código; os ticks seguintes NÃO consultam de novo', async (cStat) => {
    const d = await pendente(cStat === '302' ? 'SENT' : 'PROCESSING');
    mockPort.consultar.mockImplementation(
      async (ref: string): Promise<EmissaoResult> =>
        ref.startsWith(d.id) ? { status: 'DENIED', partnerRef: ref, errors: [{ code: cStat, message: 'Uso Denegado' }] } : { status: 'PROCESSING', partnerRef: ref, errors: [] },
    );
    const t1 = await tick();
    expect(t1.failed).toBe(0); // não é falha de consulta: é o resultado da SEFAZ
    const r = await row(d.id);
    expect(r.status).toBe('DENIED');
    expect(JSON.parse(r.errorsJson ?? '[]')).toEqual([{ code: cStat, message: 'Uso Denegado' }]);

    const antes = chamadasDe(d.id);
    expect(antes).toBe(1);
    for (let i = 0; i < 3; i += 1) await tick();
    expect(chamadasDe(d.id)).toBe(antes); // terminal: SENT|PROCESSING só — DENIED nunca volta ao polling
    expect((await row(d.id)).status).toBe('DENIED');
  });

  it('a auditoria sai como dfe.denied (nunca dfe.rejected) e o payload leva o código', async () => {
    const d = await pendente();
    mockPort.consultar.mockImplementation(
      async (ref: string): Promise<EmissaoResult> => (ref.startsWith(d.id) ? { status: 'DENIED', partnerRef: ref, errors: [{ code: '110', message: 'Uso Denegado' }] } : { status: 'PROCESSING', partnerRef: ref, errors: [] }),
    );
    await tick();
    const eventos = append.mock.calls.map((c) => (c[2] as { eventType: string; targetId: string }) ).filter((e) => e.targetId === d.id).map((e) => e.eventType);
    expect(eventos).toEqual(['dfe.denied']);
  });

  it('DENIED não é reenviável: reenviar → 400 reenvio_bloqueado e nada muda', async () => {
    const d = await pendente();
    mockPort.consultar.mockImplementation(
      async (ref: string): Promise<EmissaoResult> => (ref.startsWith(d.id) ? { status: 'DENIED', partnerRef: ref, errors: [{ code: '301', message: 'Uso Denegado' }] } : { status: 'PROCESSING', partnerRef: ref, errors: [] }),
    );
    await tick();
    await expect(service.reenviar(scope, d.id)).rejects.toThrow(/reenvio_bloqueado.*DENIED/);
    expect((await row(d.id)).status).toBe('DENIED');
  });
});
