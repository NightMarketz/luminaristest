/**
 * BE-INCR-DP-F0-F1 item 46 (PR-4) — contrato HTTP do trabalhador, do vínculo e das versões: 401 em todas as rotas, 400
 * do DTO e do `reason`, Tier-0 (404 de unidade e de registro alheio), envelope, 201/204, `salarioCents` em string e a
 * porta `EmployeeRowLookup` do factory sobre o motor (linha de `employees` do dono, apagada depois ⇒ marca no read).
 */
import { randomBytes } from 'crypto';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { authHeader, makeApp, pushTestSchema, seedUnit } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-dp-vinc';
const UNIT_OUTRO = 'unit-dp-vinc-outro';
const CUID = 'ckq1x2y3z0000abcd1234efgh';
const CPF = '52998224725';

let dono: { id: string; username: string };
let outro: { id: string; username: string };

async function employeesRow(userId: string): Promise<string> {
  const t = await prisma.dynamicTable.create({ data: { userId, name: 'Employees', internalName: 'employees', category: 'people', schema: { fields: [] } } });
  return (await prisma.dynamicTableData.create({ data: { dynamicTableId: t.id, data: { name: 'Ana' } } })).id;
}

describe('/api/dp trabalhador, vínculo e versões (item 46)', () => {
  beforeAll(async () => {
    process.env.DP_AUDIT_KEYS = `1:${randomBytes(32).toString('base64')}`;
    process.env.DP_AUDIT_KEY_ACTIVE = '1';
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'dpvr', username: 'dpvr-dono', email: 'dpvr@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: dono.id, id: UNIT });
    outro = await prisma.user.create({ data: { name: 'dpvr2', username: 'dpvr-outro', email: 'dpvr2@test.local', password: 'x', role: 'USER' } });
    await seedUnit({ userId: outro.id, id: UNIT_OUTRO });
  }, 120000);
  afterAll(async () => {
    delete process.env.DP_AUDIT_KEYS;
    delete process.env.DP_AUDIT_KEY_ACTIVE;
    await prisma.$disconnect();
  });

  it('401 sem token em todas as rotas', async () => {
    const rotas: [string, string][] = [
      ['get', '/api/dp/trabalhadores'], ['post', '/api/dp/trabalhadores'], ['get', `/api/dp/trabalhadores/${CUID}`],
      ['patch', `/api/dp/trabalhadores/${CUID}`], ['delete', `/api/dp/trabalhadores/${CUID}`],
      ['get', '/api/dp/vinculos'], ['post', '/api/dp/vinculos'], ['get', `/api/dp/vinculos/${CUID}`], ['delete', `/api/dp/vinculos/${CUID}`],
      ['post', `/api/dp/vinculos/${CUID}/versoes`], ['patch', `/api/dp/vinculos/${CUID}/versoes/${CUID}`],
    ];
    for (const [m, p] of rotas) {
      const r = request(app) as unknown as Record<string, (u: string) => request.Test>;
      expect((await r[m](p).query({ unitId: UNIT }).send({})).status).toBe(401);
    }
  });

  it('trabalhador: CPF sem DV ⇒ 400; unidade alheia ⇒ 404; employeeRef do motor; 201 → GET → PATCH → GET alheio 404', async () => {
    const auth = authHeader(dono);
    const corpo = { unitId: UNIT, cpf: CPF, nome: 'Ana', nascimento: '1990-03-10' };
    expect((await request(app).post('/api/dp/trabalhadores').set(auth).send({ ...corpo, cpf: '52998224724' })).status).toBe(400);
    expect((await request(app).post('/api/dp/trabalhadores').set(auth).send({ ...corpo, unitId: UNIT_OUTRO })).status).toBe(404);
    // Linha de `employees` de OUTRO dono ⇒ 400 com o reason (guarda cross-tenant da porta). A tabela do dono existe ANTES,
    // para o 400 sair do `row.dynamicTableId === table.id`, e não do "dono sem tabela" (achado 1 do revisor do #1032).
    const linha = await employeesRow(dono.id);
    const alheia = await employeesRow(outro.id);
    const r400 = await request(app).post('/api/dp/trabalhadores').set(auth).send({ ...corpo, employeeRef: alheia });
    expect([r400.status, r400.body.code]).toEqual([400, 'DP_EMPLOYEE_REF_INVALIDO']);
    const t = await request(app).post('/api/dp/trabalhadores').set(auth).send({ ...corpo, employeeRef: linha });
    expect([t.status, t.body.success, t.body.data.pessoaOperacionalRemovida]).toEqual([201, true, false]);
    const id = t.body.data.id;
    await prisma.dynamicTableData.update({ where: { id: linha }, data: { deletedAt: new Date() } });
    expect((await request(app).get(`/api/dp/trabalhadores/${id}`).set(auth).query({ unitId: UNIT })).body.data.pessoaOperacionalRemovida).toBe(true);
    expect((await request(app).patch(`/api/dp/trabalhadores/${id}`).set(auth).send({ unitId: UNIT, pcd: true })).body.data).toMatchObject({ pcd: true, nome: 'Ana' });
    expect((await request(app).get(`/api/dp/trabalhadores/${id}`).set(authHeader(outro)).query({ unitId: UNIT_OUTRO })).status).toBe(404);
    const dup = await request(app).post('/api/dp/trabalhadores').set(auth).send(corpo);
    expect([dup.status, dup.body.code]).toEqual([409, 'DP_CPF_DUPLICADO']);
  });

  it('vínculo + versões por HTTP: 104 ⇒ 400 com reason; 201 com a 1ª versão; versão nova; correção; salário em string; DELETE 204', async () => {
    const auth = authHeader(dono);
    const lot = await request(app).post('/api/dp/lotacoes').set(auth).send({ unitId: UNIT, codigo: 'VL1', descricao: 'Loja' });
    const car = await request(app).post('/api/dp/cargos').set(auth).send({ unitId: UNIT, nome: 'Manicure', cbo: '516120' });
    const jor = await request(app).post('/api/dp/jornadas').set(auth).send({ unitId: UNIT, nome: '44h', minutosSemanais: 2640, diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'], minutosPorDia: 440, tipoJornada: '9' });
    const t = await request(app).post('/api/dp/trabalhadores').set(auth).send({ unitId: UNIT, cpf: '11144477735', nome: 'Bia', nascimento: '1995-01-01' });
    const versao = { lotacaoId: lot.body.data.id, cargoId: car.body.data.id, jornadaId: jor.body.data.id, salarioCents: '300000', unidadeSalario: '5' };
    const base = { unitId: UNIT, trabalhadorId: t.body.data.id, matricula: 'V-1', dataInicio: '2026-01-01', versao };
    const fora = await request(app).post('/api/dp/vinculos').set(auth).send({ ...base, categoria: '104' });
    expect([fora.status, fora.body.code]).toEqual([400, 'DP_CATEGORIA_FORA_DO_NUCLEO']);
    expect((await request(app).post('/api/dp/vinculos').set(auth).send({ ...base, categoria: '101', extra: 1 })).status).toBe(400);
    const v = await request(app).post('/api/dp/vinculos').set(auth).send({ ...base, categoria: '101' });
    expect([v.status, v.body.data.versoes.length, v.body.data.versoes[0].salarioCents]).toEqual([201, 1, '300000']);
    const vid = v.body.data.id;
    const nova = await request(app).post(`/api/dp/vinculos/${vid}/versoes`).set(auth).send({ unitId: UNIT, vigenteDesde: '2026-06-01', ...versao, salarioCents: '330000' });
    expect([nova.status, nova.body.data.salarioCents]).toEqual([201, '330000']);
    const corr = await request(app).patch(`/api/dp/vinculos/${vid}/versoes/${nova.body.data.id}`).set(auth).send({ unitId: UNIT, salarioCents: '331000' });
    expect([corr.status, corr.body.data.salarioCents, corr.body.data.vigenteDesde]).toEqual([200, '331000', '2026-06-01']);
    const det = await request(app).get(`/api/dp/vinculos/${vid}`).set(auth).query({ unitId: UNIT });
    expect(det.body.data.versoes.map((x: { vigenteAte: string | null }) => x.vigenteAte)).toEqual(['2026-05-31', null]);
    expect((await request(app).get('/api/dp/vinculos').set(auth).query({ unitId: UNIT })).body.data.map((x: { id: string }) => x.id)).toEqual([vid]);
    expect((await request(app).get(`/api/dp/vinculos/${vid}`).set(authHeader(outro)).query({ unitId: UNIT_OUTRO })).status).toBe(404);
    const ocupado = await request(app).delete(`/api/dp/trabalhadores/${t.body.data.id}`).set(auth).query({ unitId: UNIT });
    expect([ocupado.status, ocupado.body.code]).toEqual([409, 'DP_TRABALHADOR_COM_VINCULO']);
    expect((await request(app).delete(`/api/dp/vinculos/${vid}`).set(auth).query({ unitId: UNIT })).status).toBe(204);
    expect((await request(app).delete(`/api/dp/trabalhadores/${t.body.data.id}`).set(auth).query({ unitId: UNIT })).status).toBe(204);
  });
});
