/**
 * Lacunas cf36/3cf5 (dono, 25/11/2026) — HTTP de ponta a ponta com SQLite real: `POST /api/nfe/dfe/documents/:id/rearmar-polling`
 * devolve ao job de polling o documento que ele abandonou (teto de tentativas), e a `FiscalDocumentView` expõe o estado
 * (`poll.gaveUpAt`). Rota → controller → serviço (policy) → repositório, sem mock de camada.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { AccountingPolicy } from '@/features/accounting/policies/AccountingPolicy';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-rearmar-poll';
const UNIT_INTRUSO = 'unit-rearmar-poll-intruso';
const GAVE_UP = new Date('2026-11-24T10:00:00.000Z');

let dono: { id: string; username: string };
let intruso: { id: string; username: string };

let seq = 0;
async function semear(over: Record<string, unknown> = {}) {
  seq += 1;
  return prisma.fiscalDocument.create({
    data: {
      userId: dono.id, unitId: UNIT, kind: 'NFSE', status: 'PROCESSING', saleId: `sale-rearmar-${seq}`, saleKey: `sale-rearmar-${seq}`,
      anchorEntryId: 'je-rearmar', ambiente: 'homologacao', partner: 'null', serie: 1, numero: BigInt(seq), dCompet: '2026-11-01', vServCents: 100n,
      pollAttempts: 8, pollGaveUpAt: GAVE_UP, pollLastError: 'sefaz_http: HTTP 503', ...over,
    },
  });
}
const rearmar = (user: { id: string; username: string } | null, id: string, unitId: string | null = UNIT) => {
  const req = request(app).post(`/api/nfe/dfe/documents/${id}/rearmar-polling`).send(unitId ? { unitId } : {});
  return user ? req.set(authHeader(user)) : req;
};
const row = (id: string) => prisma.fiscalDocument.findUniqueOrThrow({ where: { id } });

describe('POST /api/nfe/dfe/documents/:id/rearmar-polling (cf36/3cf5)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'rearmar', username: 'rearmar-dono', email: 'rearmar@test.local', password: 'x', role: 'USER' } });
    intruso = await prisma.user.create({ data: { name: 'intruso', username: 'rearmar-intruso', email: 'rearmar-i@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    await seedUnit({ userId: intruso.id, id: UNIT_INTRUSO });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('200: a view do documento abandonado expõe poll.gaveUpAt; depois do re-arme a desistência e as tentativas zeram e o status fica', async () => {
    const doc = await semear();
    const lido = await request(app).get(`/api/nfe/dfe/documents/${doc.id}`).query({ unitId: UNIT }).set(authHeader(dono));
    expect(lido.status).toBe(200);
    expect(lido.body.data.poll).toMatchObject({ attempts: 8, gaveUpAt: GAVE_UP.toISOString(), lastError: 'sefaz_http: HTTP 503' });

    const res = await rearmar(dono, doc.id);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(doc.id);
    expect(res.body.data.status).toBe('PROCESSING');
    expect(res.body.data.poll).toMatchObject({ attempts: 0, gaveUpAt: null });
    const r = await row(doc.id);
    expect(r.pollGaveUpAt).toBeNull();
    expect(r.pollAttempts).toBe(0);
    expect(r.nextPollAt).toBeNull();
    expect(r.status).toBe('PROCESSING');
  });

  it('documento terminal (AUTHORIZED) não é mexido: 200 com a view atual, contadores intactos', async () => {
    const doc = await semear({ status: 'AUTHORIZED' });
    const res = await rearmar(dono, doc.id);
    expect(res.status).toBe(200);
    expect((await row(doc.id)).pollGaveUpAt?.toISOString()).toBe(GAVE_UP.toISOString());
  });

  it('sem token ⇒ 401; sem unitId ⇒ 400; sem permissão ⇒ 403 sem gravar; outro tenant ⇒ sem efeito', async () => {
    const doc = await semear();
    expect((await rearmar(null, doc.id)).status).toBe(401);
    expect((await rearmar(dono, doc.id, null)).status).toBe(400);

    const spy = jest.spyOn(AccountingPolicy.prototype, 'canEmitFiscalDocument').mockReturnValue(false);
    try {
      expect((await rearmar(dono, doc.id)).status).toBe(403);
    } finally {
      spy.mockRestore();
    }
    expect((await row(doc.id)).pollGaveUpAt).not.toBeNull();

    const intr = await rearmar(intruso, doc.id, UNIT_INTRUSO);
    expect(intr.status).toBeGreaterThanOrEqual(400);
    expect((await row(doc.id)).pollGaveUpAt).not.toBeNull();
  });
});
