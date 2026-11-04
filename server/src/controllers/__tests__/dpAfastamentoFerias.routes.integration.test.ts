/**
 * BE-INCR-DP-F0-F1 itens 59–60 (PR-6) — contrato HTTP do afastamento e das férias do vínculo: 401 em todas as rotas, 400
 * do DTO e do `reason`, Tier-0 (404 de unidade e de vínculo alheio), envelope, 201/204, 409 de sobreposição e os períodos
 * de férias com os dias implantados.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { authHeader, makeApp, pushTestSchema, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-dp-afas';
const UNIT_OUTRO = 'unit-dp-afas-outro';
const CUID = 'ckq1x2y3z0000abcd1234efgh';
const CPF = '52998224725';

let dono: { id: string; username: string };
let outro: { id: string; username: string };
let vinculoId: string;

describe('/api/dp/vinculos/:id afastamentos e férias (itens 59–60)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'dpaf', username: 'dpaf-dono', email: 'dpaf@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    outro = await prisma.user.create({ data: { name: 'dpaf2', username: 'dpaf-outro', email: 'dpaf2@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
    const auth = authHeader(dono);
    const post = async (path: string, body: object) => (await request(app).post(`/api/dp/${path}`).set(auth).send({ unitId: UNIT, ...body })).body.data.id as string;
    const lotacaoId = await post('lotacoes', { codigo: 'L1', descricao: 'Loja' });
    const cargoId = await post('cargos', { nome: 'Manicure', cbo: '516120' });
    const jornadaId = await post('jornadas', { nome: '44h', minutosSemanais: 2640, tipoJornada: '9' });
    const trabalhadorId = await post('trabalhadores', { cpf: CPF, nome: 'Ana', nascimento: '1990-03-10' });
    vinculoId = await post('vinculos', {
      trabalhadorId,
      matricula: 'M1',
      categoria: '101',
      dataInicio: '2025-03-10',
      versao: { lotacaoId, cargoId, jornadaId, salarioCents: '300000', unidadeSalario: '5' },
    });
  }, 120000);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('401 sem token em todas as rotas', async () => {
    const b = `/api/dp/vinculos/${CUID}`;
    const rotas: [string, string][] = [
      ['get', `${b}/afastamentos`], ['post', `${b}/afastamentos`], ['patch', `${b}/afastamentos/${CUID}`], ['delete', `${b}/afastamentos/${CUID}`],
      ['get', `${b}/ferias`], ['get', `${b}/ferias/implantacao`], ['post', `${b}/ferias/implantacao`],
      ['patch', `${b}/ferias/implantacao/${CUID}`], ['delete', `${b}/ferias/implantacao/${CUID}`],
    ];
    for (const [m, p] of rotas) {
      const r = request(app) as unknown as Record<string, (u: string) => request.Test>;
      expect((await r[m](p).query({ unitId: UNIT }).send({})).status).toBe(401);
    }
  });

  it('afastamento: 400 do DTO; unidade e vínculo alheios ⇒ 404; 201 → 409 sobreposto → PATCH → GET → DELETE 204', async () => {
    const auth = authHeader(dono);
    const base = `/api/dp/vinculos/${vinculoId}/afastamentos`;
    const corpo = { unitId: UNIT, motivo: '01', inicio: '2026-03-01', fim: '2026-03-20' };
    expect((await request(app).post(base).set(auth).send({ ...corpo, cid: 'J11' })).status).toBe(400);
    expect((await request(app).post(base).set(auth).send({ ...corpo, unitId: UNIT_OUTRO })).status).toBe(404);
    expect((await request(app).post(base).set(authHeader(outro)).send({ ...corpo, unitId: UNIT_OUTRO })).status).toBe(404);
    const criado = await request(app).post(base).set(auth).send(corpo);
    expect([criado.status, criado.body.success, criado.body.data.motivo]).toEqual([201, true, '01']);
    const sobre = await request(app).post(base).set(auth).send({ ...corpo, inicio: '2026-03-10', fim: undefined });
    expect([sobre.status, sobre.body.code]).toEqual([409, 'DP_AFASTAMENTO_SOBREPOSTO']);
    const id = criado.body.data.id;
    expect((await request(app).patch(`${base}/${id}`).set(auth).send({ unitId: UNIT, fim: null })).body.data.fim).toBeNull();
    expect((await request(app).get(base).set(auth).query({ unitId: UNIT })).body.data.map((a: { id: string }) => a.id)).toEqual([id]);
    expect((await request(app).get(base).set(authHeader(outro)).query({ unitId: UNIT_OUTRO })).status).toBe(404);
    expect((await request(app).delete(`${base}/${id}`).set(auth).query({ unitId: UNIT })).status).toBe(204);
    expect((await request(app).get(base).set(auth).query({ unitId: UNIT })).body.data).toEqual([]);
  });

  it('férias: dataRef obrigatória; períodos com o implantado; aquisitivo que não casa ⇒ 400 com reason; duplicado ⇒ 409', async () => {
    const auth = authHeader(dono);
    const b = `/api/dp/vinculos/${vinculoId}/ferias`;
    expect((await request(app).get(b).set(auth).query({ unitId: UNIT })).status).toBe(400);
    const errado = await request(app).post(`${b}/implantacao`).set(auth).send({ unitId: UNIT, aquisitivoInicio: '2025-03-11', diasGozados: 10, fonte: 'ficha' });
    expect([errado.status, errado.body.code]).toEqual([400, 'DP_FERIAS_PERIODO_INEXISTENTE']);
    const corpo = { unitId: UNIT, aquisitivoInicio: '2025-03-10', diasGozados: 10, fonte: 'ficha' };
    const imp = await request(app).post(`${b}/implantacao`).set(auth).send(corpo);
    expect([imp.status, imp.body.data.diasGozados, imp.body.data.informadoPorId]).toEqual([201, 10, dono.id]);
    expect((await request(app).post(`${b}/implantacao`).set(auth).send(corpo)).status).toBe(409);
    const f = await request(app).get(b).set(auth).query({ unitId: UNIT, dataRef: '2026-03-10' });
    expect(f.status).toBe(200);
    expect(f.body.data.periodos).toEqual([
      { aquisitivoInicio: '2025-03-10', aquisitivoFim: '2026-03-09', concessivoFim: '2027-03-09', diasGozadosImplantados: 10 },
      { aquisitivoInicio: '2026-03-10', aquisitivoFim: '2027-03-09', concessivoFim: '2028-03-09', diasGozadosImplantados: null },
    ]);
    const id = imp.body.data.id;
    expect((await request(app).patch(`${b}/implantacao/${id}`).set(auth).send({ unitId: UNIT, diasGozados: 30 })).body.data.diasGozados).toBe(30);
    expect((await request(app).get(`${b}/implantacao`).set(auth).query({ unitId: UNIT })).body.data.map((i: { id: string }) => i.id)).toEqual([id]);
    expect((await request(app).delete(`${b}/implantacao/${id}`).set(authHeader(outro)).query({ unitId: UNIT_OUTRO })).status).toBe(404);
    expect((await request(app).delete(`${b}/implantacao/${id}`).set(auth).query({ unitId: UNIT })).status).toBe(204);
  });
});
