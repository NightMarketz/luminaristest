/**
 * BE-INCR-DP-F0-F1 item 35 (PR-3) — contrato HTTP dos cadastros de estrutura: 401, 400 do DTO (CBO de 5 dígitos, campo
 * extra, id não-cuid), 404 de unidade e de cadastro alheio, envelope, 201/204, `limit` e parâmetros da convenção.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { authHeader, makeApp, pushTestSchema, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-dp-cad';
const UNIT_OUTRO = 'unit-dp-cad-outro';
const CUID = 'ckq1x2y3z0000abcd1234efgh';

let dono: { id: string; username: string };
let outro: { id: string; username: string };

describe('/api/dp cadastros de estrutura (item 35)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'dpcr', username: 'dpcr-dono', email: 'dpcr@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    outro = await prisma.user.create({ data: { name: 'dpcr2', username: 'dpcr-outro', email: 'dpcr2@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
  }, 120000);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('401 sem token nas cinco coleções e nos parâmetros', async () => {
    for (const p of ['lotacoes', 'cargos', 'jornadas', 'sindicatos', 'convencoes']) {
      expect((await request(app).get(`/api/dp/${p}`).query({ unitId: UNIT })).status).toBe(401);
      expect((await request(app).post(`/api/dp/${p}`).send({})).status).toBe(401);
      expect((await request(app).patch(`/api/dp/${p}/${CUID}`).send({})).status).toBe(401);
      expect((await request(app).delete(`/api/dp/${p}/${CUID}`).query({ unitId: UNIT })).status).toBe(401);
    }
    expect((await request(app).get(`/api/dp/convencoes/${CUID}/parametros`).query({ unitId: UNIT })).status).toBe(401);
  });

  it('cargo: CBO com 5 dígitos ⇒ 400; 201 → GET → PATCH → DELETE 204 → GET 404; unidade alheia ⇒ 404', async () => {
    const auth = authHeader(dono);
    expect((await request(app).post('/api/dp/cargos').set(auth).send({ unitId: UNIT, nome: 'Manicure', cbo: '51612' })).status).toBe(400);
    expect((await request(app).post('/api/dp/cargos').set(auth).send({ unitId: UNIT, nome: 'Manicure', cbo: '516120', userId: outro.id })).status).toBe(400);
    expect((await request(app).post('/api/dp/cargos').set(auth).send({ unitId: UNIT_OUTRO, nome: 'Manicure', cbo: '516120' })).status).toBe(404);
    const c = await request(app).post('/api/dp/cargos').set(auth).send({ unitId: UNIT, nome: 'Manicure', cbo: '516120' });
    expect([c.status, c.body.success, c.body.data.cbo]).toEqual([201, true, '516120']);
    const id = c.body.data.id;
    expect((await request(app).get(`/api/dp/cargos/${id}`).set(auth).query({ unitId: UNIT })).body.data.nome).toBe('Manicure');
    expect((await request(app).get(`/api/dp/cargos/${id}`).set(authHeader(outro)).query({ unitId: UNIT_OUTRO })).status).toBe(404);
    expect((await request(app).patch(`/api/dp/cargos/${id}`).set(auth).send({ unitId: UNIT, nome: 'Manicure e pedicure' })).body.data).toMatchObject({ nome: 'Manicure e pedicure', cbo: '516120' });
    expect((await request(app).delete(`/api/dp/cargos/${id}`).set(auth).query({ unitId: UNIT })).status).toBe(204);
    expect((await request(app).get(`/api/dp/cargos/${id}`).set(auth).query({ unitId: UNIT })).status).toBe(404);
    expect((await request(app).get('/api/dp/cargos/nao-cuid').set(auth).query({ unitId: UNIT })).status).toBe(400);
  });

  it('lotação: código duplicado ⇒ 409 DP_CODIGO_DUPLICADO; GET com limit; limit > 200 ⇒ 400', async () => {
    const auth = authHeader(dono);
    for (const codigo of ['A', 'B', 'C']) {
      expect((await request(app).post('/api/dp/lotacoes').set(auth).send({ unitId: UNIT, codigo, descricao: `Lotação ${codigo}` })).status).toBe(201);
    }
    const dup = await request(app).post('/api/dp/lotacoes').set(auth).send({ unitId: UNIT, codigo: 'A', descricao: 'dup' });
    expect([dup.status, dup.body.code]).toEqual([409, 'DP_CODIGO_DUPLICADO']);
    const l = await request(app).get('/api/dp/lotacoes').set(auth).query({ unitId: UNIT, limit: 2 });
    expect(l.body.data.map((x: { codigo: string }) => x.codigo)).toEqual(['A', 'B']);
    expect((await request(app).get('/api/dp/lotacoes').set(auth).query({ unitId: UNIT, limit: 201 })).status).toBe(400);
  });

  it('jornada, sindicato, convenção e piso por HTTP; valorInt sai em string', async () => {
    const auth = authHeader(dono);
    expect((await request(app).post('/api/dp/jornadas').set(auth).send({ unitId: UNIT, nome: '44h', minutosSemanais: 2640, diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'], minutosPorDia: 440, tipoJornada: '8' })).status).toBe(400);
    expect((await request(app).post('/api/dp/jornadas').set(auth).send({ unitId: UNIT, nome: '44h', minutosSemanais: 2640, diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'], minutosPorDia: 440, tipoJornada: '4' })).status).toBe(201);
    const s = await request(app).post('/api/dp/sindicatos').set(auth).send({ unitId: UNIT, cnpj: '11222333000181', nome: 'Sind' });
    expect(s.status).toBe(201);
    const cargo = await request(app).post('/api/dp/cargos').set(auth).send({ unitId: UNIT, nome: 'Cabeleireiro', cbo: '516110' });
    const conv = await request(app).post('/api/dp/convencoes').set(auth).send({
      unitId: UNIT, sindicatoId: s.body.data.id, identificacao: 'MR000001/2026', vigenteDesde: '2026-03-01', fonte: 'registro no Mediador',
    });
    expect(conv.status).toBe(201);
    const base = `/api/dp/convencoes/${conv.body.data.id}/parametros`;
    const p = await request(app).post(base).set(auth).send({
      unitId: UNIT, chave: 'PISO_SALARIAL_CENTS', discriminador: cargo.body.data.id, valorInt: '180000', clausula: 'Cláusula 3ª', vigenteDesde: '2026-03-01',
    });
    expect([p.status, p.body.data.valorInt]).toEqual([201, '180000']);
    const sobre = await request(app).post(base).set(auth).send({
      unitId: UNIT, chave: 'PISO_SALARIAL_CENTS', discriminador: cargo.body.data.id, valorInt: '190000', clausula: 'Cláusula 3ª', vigenteDesde: '2026-06-01',
    });
    expect([sobre.status, sobre.body.code]).toEqual([409, 'DP_VERSAO_SOBREPOSTA']);
    const pid = p.body.data.id;
    expect((await request(app).patch(`${base}/${pid}`).set(auth).send({ unitId: UNIT, valorInt: '185000' })).body.data.valorInt).toBe('185000');
    expect((await request(app).get(base).set(auth).query({ unitId: UNIT })).body.data).toHaveLength(1);
    expect((await request(app).get(base).set(authHeader(outro)).query({ unitId: UNIT_OUTRO })).status).toBe(404);
    expect((await request(app).delete(`${base}/${pid}`).set(auth).query({ unitId: UNIT })).status).toBe(204);
    expect((await request(app).get(base).set(auth).query({ unitId: UNIT })).body.data).toEqual([]);
  });
});
