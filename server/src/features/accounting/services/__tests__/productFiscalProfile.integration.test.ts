/**
 * BE-INCR-NFCE (nó X10a, itens 10, 26 e 30–31) — perfil fiscal do produto pela rota, em SQLite real: CRUD, tenancy por
 * dono, rename-on-delete e o F-NFCE-3 (b) — duas unidades do mesmo dono leem a MESMA linha.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
const B = '/api/accounting/product-fiscal-profiles';

async function dono(nome: string, unidades: string[]) {
  const u = await prisma.user.create({ data: { name: nome, username: nome, email: `${nome}@test.local`, password: 'x', role: 'USER' } });
  for (const id of unidades) await seedUnit({ userId: u.id, id });
  return { id: u.id, username: u.username };
}
const corpo = (unitId: string, over: Record<string, unknown> = {}) => ({
  unitId,
  ncm: '33051000',
  origem: 0,
  cfopPadrao: '5102',
  csosn: '102',
  uCom: 'UN',
  cEan: 'SEM GTIN',
  cstPis: '49',
  cstCofins: '49',
  ...over,
});

beforeAll(() => pushTestSchema());
afterAll(() => prisma.$disconnect());

describe('ProductFiscalProfile — rota (BE-INCR-NFCE item 10)', () => {
  it('upsert idempotente + duas unidades do mesmo dono leem o mesmo perfil + audit só com códigos', async () => {
    const u = await dono('pfp-a', ['pfp-a-u1', 'pfp-a-u2']);
    const r1 = await request(app).put(`${B}/prod-1`).set(authHeader(u)).send(corpo('pfp-a-u1', { xProd: 'Shampoo 300 ml' }));
    expect(r1.status).toBe(200);
    expect(r1.body.data).toMatchObject({ productRef: 'prod-1', ncm: '33051000', csosn: '102', xProd: 'Shampoo 300 ml' });
    const r2 = await request(app).put(`${B}/prod-1`).set(authHeader(u)).send(corpo('pfp-a-u1', { ncm: '33059000' }));
    expect(r2.status).toBe(200);
    expect(await prisma.productFiscalProfile.count({ where: { userId: u.id } })).toBe(1);

    const daOutra = await request(app).get(`${B}/prod-1`).query({ unitId: 'pfp-a-u2' }).set(authHeader(u));
    expect(daOutra.status).toBe(200);
    expect(daOutra.body.data.ncm).toBe('33059000');

    const row = await prisma.productFiscalProfile.findFirstOrThrow({ where: { userId: u.id } });
    const audits = await prisma.auditEvent.findMany({ where: { eventType: 'product_fiscal_profile.updated', targetId: row.id } });
    expect(audits).toHaveLength(2);
    expect(audits.map((a) => a.payload).join('|')).not.toContain('Shampoo'); // xProd é texto livre: fora da trilha (item 26)
  });

  it('tenancy: outro dono não vê o perfil', async () => {
    const a = await dono('pfp-b', ['pfp-b-u1']);
    const b = await dono('pfp-c', ['pfp-c-u1']);
    expect((await request(app).put(`${B}/prod-x`).set(authHeader(a)).send(corpo('pfp-b-u1'))).status).toBe(200);
    expect((await request(app).get(`${B}/prod-x`).query({ unitId: 'pfp-c-u1' }).set(authHeader(b))).status).toBe(404);
    expect((await request(app).get(B).query({ unitId: 'pfp-c-u1' }).set(authHeader(b))).body.data).toEqual([]);
  });

  it('delete = soft com rename-on-delete; recriar não colide (P2002)', async () => {
    const u = await dono('pfp-d', ['pfp-d-u1']);
    expect((await request(app).put(`${B}/prod-2`).set(authHeader(u)).send(corpo('pfp-d-u1'))).status).toBe(200);
    expect((await request(app).delete(`${B}/prod-2`).query({ unitId: 'pfp-d-u1' }).set(authHeader(u))).status).toBe(200);
    const apagada = await prisma.productFiscalProfile.findFirst({ where: { userId: u.id } });
    expect(apagada?.deletedAt).not.toBeNull();
    expect(apagada?.productRef).toBe(`deleted:${apagada?.id}:prod-2`);
    expect((await request(app).get(`${B}/prod-2`).query({ unitId: 'pfp-d-u1' }).set(authHeader(u))).status).toBe(404);
    expect((await request(app).put(`${B}/prod-2`).set(authHeader(u)).send(corpo('pfp-d-u1'))).status).toBe(200);
  });

  it('DTO .strict(): código fora da transcrição ⇒ 400 (csosn 101, cstIcms 10, PIS 03, GTIN inválido, campo extra)', async () => {
    const u = await dono('pfp-e', ['pfp-e-u1']);
    for (const over of [{ csosn: '101' }, { cstIcms: '10' }, { cstPis: '03' }, { cEan: '123' }, { ncm: '3305' }, { origem: 9 }, { extra: 1 }]) {
      const r = await request(app).put(`${B}/prod-3`).set(authHeader(u)).send(corpo('pfp-e-u1', over));
      expect([JSON.stringify(over), r.status]).toEqual([JSON.stringify(over), 400]);
    }
  });
});
