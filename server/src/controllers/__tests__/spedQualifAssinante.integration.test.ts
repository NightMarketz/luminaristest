/**
 * CONTRATO HTTP de GET /api/accounting/sped/qualif-assinante (FE-INCR-SPED-SIGNERS, F-FE-SG-1 → a) — app
 * Express REAL sobre supertest (molde: `lalurController.integration.test.ts`). O que a fiação prova:
 * deny-by-default, `layout` fechado na borda, e as DUAS tabelas servidas das consts transcritas (J930 com
 * 19 códigos, 0930 com 17 — diferentes, F-C12-2 → a), com '900' nas duas.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { SPED_ECD_QUALIF_ASSINANTE, SPED_ECF_QUALIF_ASSINANTE } from '@/features/accounting/models/spedQualifAssinante';

const app = makeApp();
const UNIT = 'unit-sped-qualif';
const URL = '/api/accounting/sped/qualif-assinante';

let dono: { id: string; username: string };

describe('GET /api/accounting/sped/qualif-assinante — contrato HTTP', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'sped-qualif', username: 'sped-qualif', email: 'sped-qualif@test.local', password: 'x', role: 'USER' } });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sem token → 401 (deny-by-default)', async () => {
    const res = await request(app).get(URL).query({ unitId: UNIT, layout: 'ECD' });
    expect(res.status).toBe(401);
  });

  it('layout fora de ECD|ECF → 400; controle: ECD → 200', async () => {
    const bad = await request(app).get(URL).query({ unitId: UNIT, layout: 'ECX' }).set(authHeader(dono));
    expect(bad.status).toBe(400);
    const ok = await request(app).get(URL).query({ unitId: UNIT, layout: 'ECD' }).set(authHeader(dono));
    expect(ok.status).toBe(200);
  });

  it('ECD devolve a tabela J930 (19 códigos) e ECF a 0930 (17) — tabelas diferentes, 900 nas duas', async () => {
    const ecd = await request(app).get(URL).query({ unitId: UNIT, layout: 'ECD' }).set(authHeader(dono));
    const ecf = await request(app).get(URL).query({ unitId: UNIT, layout: 'ECF' }).set(authHeader(dono));
    expect(ecd.body.data).toEqual(Object.entries(SPED_ECD_QUALIF_ASSINANTE).map(([code, description]) => ({ code, description })));
    expect(ecf.body.data).toEqual(Object.entries(SPED_ECF_QUALIF_ASSINANTE).map(([code, description]) => ({ code, description })));
    expect(ecd.body.data).toHaveLength(19);
    expect(ecf.body.data).toHaveLength(17);
    expect(ecd.body.data.map((r: { code: string }) => r.code)).toContain('001'); // só na J930
    expect(ecf.body.data.map((r: { code: string }) => r.code)).not.toContain('001');
    for (const t of [ecd, ecf]) expect(t.body.data.find((r: { code: string }) => r.code === '900')).toBeTruthy();
  });
});
