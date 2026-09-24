/**
 * BE-INCR-ONBOARDING-FIRST-UNIT (nó I1, BRIEF itens 1–4) — contrato HTTP do `POST /dashboard/create`:
 * a primeira linha de `units` nasce no onboarding, pelo caminho de escrita com plugins, e a resposta devolve o
 * `unitId`. `unit` é obrigatório (F-I1-2 b). Falha na criação da unidade ⇒ compensação (F-I1-4 b).
 * Cada create precisa de um usuário novo: a guarda one-shot responde 403 a quem já tem tabelas.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { DynamicTableService } from '@/features/dynamicTables/services/DynamicTableService';

const app = makeApp();
let n = 0;
const novoUsuario = () => {
  n += 1;
  return prisma.user
    .create({ data: { name: `i1-${n}`, username: `i1-user-${n}`, email: `i1-${n}@test.local`, password: 'x', role: 'USER' } })
    .then((u) => ({ id: u.id, username: u.username }));
};
const criar = (who: { id: string; username: string }, body: Record<string, unknown>) =>
  request(app).post('/api/dashboard/create').set(authHeader(who)).send(body);
const linhasDe = async (userId: string, internalName: string) => {
  const t = await prisma.dynamicTable.findFirst({ where: { userId, internalName } });
  return t ? prisma.dynamicTableData.findMany({ where: { dynamicTableId: t.id } }) : [];
};

describe('I1 — a primeira unidade nasce no onboarding', () => {
  beforeAll(() => {
    pushTestSchema();
  }, 120000);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 1 (F-I1-2 b): sem unit → 400; unit com chave desconhecida → 400; type fora das opções → 400; nada instalado', async () => {
    const u = await novoUsuario();
    expect((await criar(u, { suiteKey: 'beautySalon' })).status).toBe(400);
    expect((await criar(u, { suiteKey: 'beautySalon', unit: { name: 'Matriz', foo: 1 } })).status).toBe(400);
    expect((await criar(u, { suiteKey: 'beautySalon', unit: { name: 'Matriz', type: 'Filial' } })).status).toBe(400);
    expect((await criar(u, { suiteKey: 'beautySalon', unit: { name: '   ' } })).status).toBe(400);
    expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBe(0);
  });

  it('itens 2 e 4 (modo Rápido): 201 com unitId = id da ÚNICA linha de units; plugins rodaram (Pipeline Padrão); contas do escopo respondem 200', async () => {
    const u = await novoUsuario();
    const r = await criar(u, { suiteKey: 'beautySalon', unit: { name: 'Matriz Centro', type: 'Own' } });
    expect(r.status).toBe(201);
    const unidades = await linhasDe(u.id, 'units');
    expect(unidades).toHaveLength(1);
    expect(r.body.data).toMatchObject({ suiteKey: 'beautySalon', unitId: unidades[0].id });
    expect(unidades[0].data).toMatchObject({ name: 'Matriz Centro', type: 'Own' });
    // o plugin de `units` (LeadsSeedOnUnitPlugin) só roda no caminho de escrita normal — prova de F-I1-1 (b)
    const pipelines = await linhasDe(u.id, 'leadPipelines');
    expect(pipelines.map((p) => (p.data as { name: string }).name)).toContain('Pipeline Padrão');
    const contas = await request(app).get('/api/accounting/accounts').set(authHeader(u)).query({ unitId: r.body.data.unitId });
    expect(contas.status).toBe(200);
  });

  it('item 4 (modo Controle Total): 201 com presetKey, unitId e as listas de tabelas', async () => {
    const u = await novoUsuario();
    const r = await criar(u, { mode: 'custom', presetKey: 'beautySalon', removedTables: [], addedFields: {}, unit: { name: 'Loja 1' } });
    expect(r.status).toBe(201);
    const unidades = await linhasDe(u.id, 'units');
    expect(unidades).toHaveLength(1);
    expect(r.body.data).toMatchObject({ presetKey: 'beautySalon', unitId: unidades[0].id });
    expect(r.body.data.tables.core).toContain('units');
    expect(r.body.data.tables.business.length).toBeGreaterThan(0);
  });

  it('item 3 (F-I1-4 b): falha ao criar a unidade → 500 ONBOARDING_ROLLED_BACK, sistema desfeito, e um novo create NÃO recebe 403', async () => {
    const u = await novoUsuario();
    jest.spyOn(DynamicTableService.prototype, 'createTableData').mockRejectedValueOnce(new Error('falha injetada'));
    const r = await criar(u, { suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
    expect(r.status).toBe(500);
    expect(r.body.errorCode).toBe('ONBOARDING_ROLLED_BACK');
    expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBe(0);
    const tables = await request(app).get('/api/dynamic-tables').set(authHeader(u));
    expect(tables.body.data ?? []).toEqual([]);

    jest.restoreAllMocks();
    const retry = await criar(u, { suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
    expect(retry.status).toBe(201);
    expect(await linhasDe(u.id, 'units')).toHaveLength(1);
  });

  it('a guarda one-shot continua: segundo create do mesmo usuário → 403, sem segunda unidade', async () => {
    const u = await novoUsuario();
    expect((await criar(u, { suiteKey: 'beautySalon', unit: { name: 'A' } })).status).toBe(201);
    expect((await criar(u, { suiteKey: 'beautySalon', unit: { name: 'B' } })).status).toBe(403);
    expect(await linhasDe(u.id, 'units')).toHaveLength(1);
  });
});
