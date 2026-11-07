/**
 * BE-INCR-DP-F0-F1 item 54 (PR-5) — contrato HTTP de GET /api/dp/rubricas: 401, 400 sem `unitId`, 404 de unidade alheia
 * e o catálogo real no envelope, com `conferidoPeloContador: false` (item 51).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { authHeader, makeApp, pushTestSchema, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-dp-rub';
const UNIT_OUTRO = 'unit-dp-rub-outro';
const BASE = '/api/dp/rubricas';

let dono: { id: string; username: string };

describe('GET /api/dp/rubricas (item 54)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'dpr', username: 'dpr-dono', email: 'dpr@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    const outro = await prisma.user.create({ data: { name: 'dpr2', username: 'dpr-outro', email: 'dpr2@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
  }, 120000);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('401 sem token; 400 sem unitId ou com campo extra; 404 de unidade alheia', async () => {
    expect((await request(app).get(BASE).query({ unitId: UNIT })).status).toBe(401);
    expect((await request(app).get(BASE).set(authHeader(dono))).status).toBe(400);
    expect((await request(app).get(BASE).set(authHeader(dono)).query({ unitId: UNIT, x: '1' })).status).toBe(400);
    expect((await request(app).get(BASE).set(authHeader(dono)).query({ unitId: UNIT_OUTRO })).status).toBe(404);
  });

  it('200 devolve o catálogo de código, não conferido pelo contador', async () => {
    const r = await request(app).get(BASE).set(authHeader(dono)).query({ unitId: UNIT });
    expect([r.status, r.body.success, r.body.data.conferidoPeloContador]).toEqual([200, true, false]);
    expect(r.body.data.rubricas.map((x: { codigo: string }) => x.codigo)).toEqual(['SALARIO_BASE', 'BOLSA_ESTAGIO', 'PRO_LABORE', 'INSS_SEGURADO', 'IRRF', 'FGTS_MES', 'HORA_EXTRA_50', 'HORA_EXTRA_100', 'ADICIONAL_NOTURNO', 'COMISSAO', 'FALTAS', 'DSR_VARIAVEIS', 'DSR_PERDIDO', 'COMPLEMENTO_MINIMO', 'COMPLEMENTO_PISO', 'AFASTAMENTO_EMPRESA_15D', 'ADIANTAMENTO', 'DESCONTO_ADIANTAMENTO', 'SALARIO_FAMILIA']);
    expect(r.body.data.rubricas[0]).toEqual({
      codigo: 'SALARIO_BASE',
      nome: { pt: 'Salário base', en: 'Base salary' },
      tipo: 'PROVENTO',
      natureza: '1000',
      incidencia: { cp: '11', irrf: '11', fgts: '11' },
      categorias: ['101', '103'],
      calculo: 'CONTRATUAL',
    });
  });
});
