/**
 * CONTRATO HTTP de GET /api/accounting/delivery (FE-INCR-DELIVERY PR-D1, F-FE-DL-4 → a) — app Express REAL
 * sobre supertest + SQLite REAL (molde: `accountingContactController.integration.test.ts`). As linhas são
 * semeadas pelo Prisma: montar uma entrega real exige período HARD_CLOSED + revisão assinada, e o que esta
 * rota promete é só a LEITURA — deny-by-default, `.strict()` na borda, escopo (a entrega de outro dono não
 * aparece), filtro por status/ano, paginação e cada entrega com os seus `items[]` em `position`.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-delivery-list';
const URL = '/api/accounting/delivery';

let dono: { id: string; username: string };
let outro: { id: string; username: string };

const criarUsuario = (username: string) =>
  prisma.user.create({ data: { name: username, username, email: `${username}@test.local`, password: 'x', role: 'USER' } });

const criarJob = (userId: string, kind: string) =>
  prisma.accountingDataExchangeJob.create({
    data: { userId, unitId: UNIT, direction: 'EXPORT', kind, status: 'EXPORTED', requestedById: userId, sha256: `sha-${kind}` },
  });

async function criarEntrega(userId: string, year: number, status: string, extras = 0) {
  const contact = await prisma.accountingContact.create({
    data: { userId, unitId: UNIT, name: `C ${year} ${status}`, email: 'c@x.com', cpf: '52998224725', crcNumber: 'SP-000777/O-1', crcUf: 'SP' },
  });
  const ecd = await criarJob(userId, 'EXPORT_SPED_ECD');
  const ecf = await criarJob(userId, 'EXPORT_SPED_ECF');
  const log = await prisma.accountingDeliveryLog.create({
    data: {
      userId, unitId: UNIT, contactId: contact.id, ecdJobId: ecd.id, ecfJobId: ecf.id,
      periodStart: new Date(Date.UTC(year, 0, 1)), periodEnd: new Date(Date.UTC(year, 11, 31)),
      manifestSha256Ecd: 'a', manifestSha256Ecf: 'b', status, requestedById: userId,
    },
  });
  const extraJobs = [];
  for (let i = 0; i < extras; i += 1) extraJobs.push(await criarJob(userId, 'EXPORT_TRIAL_BALANCE'));
  // Criados FORA de ordem de propósito: a resposta tem de vir por `position`.
  const rows = [...extraJobs.map((j, i) => ({ jobId: j.id, kind: j.kind, position: 2 + i })), { jobId: ecf.id, kind: ecf.kind, position: 1 }, { jobId: ecd.id, kind: ecd.kind, position: 0 }];
  for (const r of rows) await prisma.accountingDeliveryItem.create({ data: { deliveryId: log.id, ...r, sha256: 'x' } });
  return log;
}

describe('GET /api/accounting/delivery — contrato HTTP', () => {
  let recente: { id: string };

  beforeAll(async () => {
    pushTestSchema();
    dono = await criarUsuario('delivery-list-a');
    outro = await criarUsuario('delivery-list-b');
    await criarEntrega(dono.id, 2024, 'FAILED');
    recente = await criarEntrega(dono.id, 2025, 'SENT', 2);
    await criarEntrega(outro.id, 2025, 'SENT');
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sem token → 401 (deny-by-default)', async () => {
    const res = await request(app).get(URL).query({ unitId: UNIT });
    expect(res.status).toBe(401);
  });

  it('.strict() e enum na borda → 400; controle: sem filtro → 200', async () => {
    const extra = await request(app).get(URL).query({ unitId: UNIT, foo: '1' }).set(authHeader(dono));
    expect(extra.status).toBe(400);
    const badStatus = await request(app).get(URL).query({ unitId: UNIT, status: 'DONE' }).set(authHeader(dono));
    expect(badStatus.status).toBe(400);
    const ok = await request(app).get(URL).query({ unitId: UNIT }).set(authHeader(dono));
    expect(ok.status).toBe(200);
  });

  it('só as entregas do escopo, mais recente primeiro, cada uma com os itens em position', async () => {
    const res = await request(app).get(URL).query({ unitId: UNIT }).set(authHeader(dono));
    expect(res.body.data.total).toBe(2); // a do `outro` não aparece
    expect(res.body.data.items[0].id).toBe(recente.id);
    expect(res.body.data.items[0].items.map((i: { position: number }) => i.position)).toEqual([0, 1, 2, 3]);
    expect(res.body.data.items[0].items[0].kind).toBe('EXPORT_SPED_ECD');
  });

  it('filtros status e year; paginação devolve total do filtro e respeita limit', async () => {
    const failed = await request(app).get(URL).query({ unitId: UNIT, status: 'FAILED' }).set(authHeader(dono));
    expect(failed.body.data.items.map((d: { status: string }) => d.status)).toEqual(['FAILED']);
    const y2025 = await request(app).get(URL).query({ unitId: UNIT, year: 2025 }).set(authHeader(dono));
    expect(y2025.body.data.items.map((d: { id: string }) => d.id)).toEqual([recente.id]);
    const page2 = await request(app).get(URL).query({ unitId: UNIT, limit: 1, page: 2 }).set(authHeader(dono));
    expect(page2.body.data).toMatchObject({ total: 2, page: 2, limit: 1 });
    expect(page2.body.data.items).toHaveLength(1);
    expect(page2.body.data.items[0].status).toBe('FAILED');
  });
});
