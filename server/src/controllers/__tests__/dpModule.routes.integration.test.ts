/**
 * BE-INCR-DP-F0-F1 item 15 (PR-1) — contrato HTTP de /api/dp/modules: 401, 400 do DTO, 404 de unidade e de ativação
 * alheia, envelope, e o registro real (todos os opcionais indisponíveis no F0 ⇒ 409 DP_MODULE_UNAVAILABLE).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { authHeader, makeApp, pushTestSchema, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-dp-mod';
const UNIT_OUTRO = 'unit-dp-mod-outro';
const BASE = '/api/dp/modules';

let dono: { id: string; username: string };
let outro: { id: string; username: string };

describe('/api/dp/modules (item 15)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'dpm', username: 'dpm-dono', email: 'dpm@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    outro = await prisma.user.create({ data: { name: 'dpm2', username: 'dpm-outro', email: 'dpm2@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
  }, 120000);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('401 sem token em todas as rotas', async () => {
    expect((await request(app).get(BASE).query({ unitId: UNIT })).status).toBe(401);
    expect((await request(app).get(`${BASE}/activations`).query({ unitId: UNIT })).status).toBe(401);
    expect((await request(app).post(`${BASE}/activations`).send({})).status).toBe(401);
    expect((await request(app).post(`${BASE}/activations/ckxxxxxxxxxxxxxxxxxxxxxxx/end`).send({})).status).toBe(401);
  });

  it('GET /dp/modules devolve o catálogo de 9 submódulos; unidade alheia ⇒ 404', async () => {
    const r = await request(app).get(BASE).set(authHeader(dono)).query({ unitId: UNIT });
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.data.map((d: { key: string }) => d.key)).toEqual(['DP-PONTO', 'DP-PAG', 'DP-BEN', 'DP-ADM', 'DP-APP', 'DP-DES', 'DP-GED', 'DP-CAT', 'DP-BI']);
    expect((await request(app).get(BASE).set(authHeader(dono)).query({ unitId: UNIT_OUTRO })).status).toBe(404);
    expect((await request(app).get(BASE).set(authHeader(dono))).status).toBe(400);
  });

  it('POST /activations: DTO inválido ⇒ 400; registro real ⇒ 409 DP_MODULE_UNAVAILABLE; nada gravado', async () => {
    const corpo = { unitId: UNIT, moduleKey: 'DP-PONTO', competenciaInicio: '2027-01', motivo: 'ponto' };
    expect((await request(app).post(`${BASE}/activations`).set(authHeader(dono)).send({ ...corpo, competenciaInicio: '2027-13' })).status).toBe(400);
    expect((await request(app).post(`${BASE}/activations`).set(authHeader(dono)).send({ ...corpo, userId: outro.id })).status).toBe(400);
    const r = await request(app).post(`${BASE}/activations`).set(authHeader(dono)).send(corpo);
    expect([r.status, r.body.code]).toEqual([409, 'DP_MODULE_UNAVAILABLE']);
    expect(await prisma.dpModuloAtivacao.count()).toBe(0);
  });

  it('GET /activations lista só as do dono; POST /:id/end de ativação alheia ⇒ 404; id não-cuid ⇒ 400', async () => {
    const alheia = await prisma.dpModuloAtivacao.create({
      data: { userId: outro.id, moduleKey: 'DP-PONTO', competenciaInicio: '2027-01', motivo: 'semeada', createdById: outro.id },
    });
    const lista = await request(app).get(`${BASE}/activations`).set(authHeader(dono)).query({ unitId: UNIT });
    expect([lista.status, lista.body.data]).toEqual([200, []]);
    const fim = { unitId: UNIT, competenciaFim: '2027-02', motivo: 'invasão' };
    expect((await request(app).post(`${BASE}/activations/${alheia.id}/end`).set(authHeader(dono)).send(fim)).status).toBe(404);
    expect((await request(app).post(`${BASE}/activations/nao-cuid/end`).set(authHeader(dono)).send(fim)).status).toBe(400);
    const doOutro = await request(app).get(`${BASE}/activations`).set(authHeader(outro)).query({ unitId: UNIT_OUTRO });
    expect(doOutro.body.data.map((a: { id: string }) => a.id)).toEqual([alheia.id]);
  });
});
