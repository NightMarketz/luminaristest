/**
 * BE-INCR-CRM-MODULE-COMPOSITION (nó I8) — contrato HTTP dos comportamentos 2, 3, 5, 7, 8, 10 e dos forks
 * F-I8-COMP3-a (clínica = CRM-0 + CRM-1) e F-I8-COMP3-b (sync-preset de tenant legado acha a fonte e não muda linhas).
 * Cada create precisa de um usuário novo (a guarda one-shot responde 403 a quem já tem tabelas).
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { getFactory } from '@/lib/factory';
import { CoreSystemPreset } from '@/features/dynamicTables/presets';
import { composeModuleTables } from '@/features/dynamicTables/presets/modules/registry';
import BeautySalonPreset from '@/features/dynamicTables/presets/systems/BeautySalonPreset';

const app = makeApp();
let n = 0;
const novoUsuario = (role: 'USER' | 'ADMIN' = 'USER') => {
  n += 1;
  return prisma.user
    .create({ data: { name: `i8-${n}`, username: `i8-user-${n}`, email: `i8-${n}@test.local`, password: 'x', role } })
    .then((u) => ({ id: u.id, username: u.username, role: u.role }));
};
const criar = (who: { id: string; username: string; role?: string }, body: Record<string, unknown>) =>
  request(app).post('/api/dashboard/create').set(authHeader(who as never)).send(body);
const tabelasDe = async (userId: string) =>
  (await prisma.dynamicTable.findMany({ where: { userId }, select: { internalName: true } })).map((t) => t.internalName);
const tabela = (userId: string, internalName: string) => prisma.dynamicTable.findFirst({ where: { userId, internalName } });
const linhasDe = async (userId: string, internalName: string) => {
  const t = await tabela(userId, internalName);
  return t ? prisma.dynamicTableData.findMany({ where: { dynamicTableId: t.id }, orderBy: { id: 'asc' } }) : [];
};
const LEADS = ['leadPipelines', 'leadStages', 'leads', 'leadActivities', 'leadProposals'];
const B2B = ['crmAccounts', 'crmContacts', 'crmOpportunities'];

describe('I8 — CRM como categoria composta por módulos', () => {
  beforeAll(() => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('c5 (F-CRM-2 a): salão novo = CRM-0 + CRM-1; sem contas/contatos/oportunidades; etapa proposal semeada', async () => {
    const u = await novoUsuario();
    const r = await criar(u, { suiteKey: 'beautySalon', unit: { name: 'Matriz' } });
    expect(r.status).toBe(201);
    expect(r.body.data.modules).toEqual({ installed: ['CRM-0', 'CRM-1'] });
    const t = await tabelasDe(u.id);
    for (const x of LEADS) expect(t).toContain(x);
    for (const x of B2B) expect(t).not.toContain(x);
    const tipos = (await linhasDe(u.id, 'leadStages')).map((s) => (s.data as { type: string }).type);
    expect(tipos).toContain('proposal');
  });

  it('F-I8-COMP3-a: clínica nova = CRM-0 + CRM-1, igual ao salão', async () => {
    const u = await novoUsuario();
    const r = await criar(u, { suiteKey: 'aestheticClinic', unit: { name: 'Clínica' } });
    expect(r.status).toBe(201);
    expect(r.body.data.modules).toEqual({ installed: ['CRM-0', 'CRM-1'] });
    const t = await tabelasDe(u.id);
    for (const x of LEADS) expect(t).toContain(x);
    for (const x of B2B) expect(t).not.toContain(x);
  });

  it('c2: salão + modules [CRM-3] instala oportunidades sem CRM-2; c4: crmModule segue com as 8 tabelas', async () => {
    const u = await novoUsuario();
    const r = await criar(u, { suiteKey: 'beautySalon', unit: { name: 'Matriz' }, modules: ['CRM-3'] });
    expect(r.status).toBe(201);
    expect(r.body.data.modules.installed).toEqual(['CRM-0', 'CRM-1', 'CRM-3']);
    const t = await tabelasDe(u.id);
    expect(t).toContain('crmOpportunities');
    expect(t).not.toContain('crmAccounts');

    const v = await novoUsuario();
    const r2 = await criar(v, { suiteKey: 'crmModule', unit: { name: 'Matriz' } });
    expect(r2.status).toBe(201);
    expect(r2.body.data.modules.installed).toEqual(['CRM-0', 'CRM-1', 'CRM-2', 'CRM-3']);
    const t2 = await tabelasDe(v.id);
    for (const x of [...LEADS, ...B2B]) expect(t2).toContain(x);
  });

  it('c2: ModuleKey desconhecido ou chave extra no body → 400, nada instalado', async () => {
    const u = await novoUsuario();
    expect((await criar(u, { suiteKey: 'beautySalon', unit: { name: 'M' }, modules: ['CRM-9'] })).status).toBe(400);
    expect((await criar(u, { suiteKey: 'beautySalon', unit: { name: 'M' }, categories: {} })).status).toBe(400);
    expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBe(0);
  });

  it('c3: tenant sem CRM (Controle Total removendo o funil) cria unidade sem pipeline e tasks sem leadId', async () => {
    const u = await novoUsuario();
    const r = await criar(u, { mode: 'custom', presetKey: 'beautySalon', removedTables: LEADS, unit: { name: 'M' } });
    expect(r.status).toBe(201);
    const t = await tabelasDe(u.id);
    for (const x of LEADS) expect(t).not.toContain(x);
    expect(await linhasDe(u.id, 'units')).toHaveLength(1);
    const tasks = await tabela(u.id, 'tasks');
    const campos = ((tasks!.schema as unknown as { fields: { name: string }[] }).fields).map((f) => f.name);
    expect(campos).not.toContain('leadId');
  });

  it('c10: addedFields sombreando campo declarado por módulo → 400; campo novo → 201', async () => {
    const u = await novoUsuario();
    const bad = await criar(u, {
      mode: 'custom', presetKey: 'beautySalon', unit: { name: 'M' },
      addedFields: { leads: [{ name: 'status', label: 'Status', type: 'string', required: false }] },
    });
    expect(bad.status).toBe(400);
    expect(bad.body.details).toMatchObject({ table: 'leads', field: 'status', moduleKey: 'CRM-0' });
    const ok = await criar(u, {
      mode: 'custom', presetKey: 'beautySalon', unit: { name: 'M' },
      addedFields: { leads: [{ name: 'instagram', label: 'Instagram', type: 'string', required: false }] },
    });
    expect(ok.status).toBe(201);
  });

  it('c11 (F-I8-C11): override em campo texto → 400 nomeado; em select da allowlist → 201 com as opções', async () => {
    const u = await novoUsuario();
    const bad = await criar(u, { suiteKey: 'crmModule', unit: { name: 'M' }, selectOverrides: { crmAccounts: { segment: ['Varejo'] } } });
    expect(bad.status).toBe(400);
    expect(bad.body.details).toEqual({ table: 'crmAccounts', field: 'segment', reason: 'NOT_A_SELECT' });
    expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBe(0);
    const ok = await criar(u, { suiteKey: 'crmModule', unit: { name: 'M' }, selectOverrides: { crmAccounts: { size: ['P', 'G'] } } });
    expect(ok.status).toBe(201);
    const size = ((await tabela(u.id, 'crmAccounts'))!.schema as unknown as { fields: { name: string; type: string; options?: string[] }[] })
      .fields.find((f) => f.name === 'size');
    expect(size).toMatchObject({ type: 'select', options: ['P', 'G'] });
  });

  it('c7: convertLead em tenant sem CRM-2 → 409 CRM_MODULE_NOT_INSTALLED com moduleKey CRM-2', async () => {
    const u = await novoUsuario();
    expect((await criar(u, { suiteKey: 'beautySalon', unit: { name: 'M' } })).status).toBe(201);
    const r = await request(app)
      .post('/api/crm/pipeline/convert-lead')
      .set(authHeader(u as never))
      .send({ leadId: 'qualquer', account: { name: 'ACME' } });
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ code: 'CRM_MODULE_NOT_INSTALLED', details: { moduleKey: 'CRM-2' } });
  });

  it('c8: tenant CRM-0 → instala CRM-2 → leads volta a ter accountId apontando para crmAccounts real; 2ª vez = already-installed', async () => {
    const u = await novoUsuario('ADMIN');
    expect((await criar(u, { suiteKey: 'beautySalon', unit: { name: 'M' } })).status).toBe(201);
    const leadsAntes = (await tabela(u.id, 'leads'))!;
    expect((leadsAntes.schema as unknown as { fields: { name: string }[] }).fields.map((f) => f.name)).not.toContain('accountId');

    const r = await request(app).post('/api/dashboard/modules/install').set(authHeader(u as never)).send({ moduleKey: 'CRM-2' });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ status: 'installed', tables: ['crmAccounts', 'crmContacts'] });
    expect(r.body.data.synced).toContain('leads');

    const accounts = (await tabela(u.id, 'crmAccounts'))!;
    const leads = (await tabela(u.id, 'leads'))!;
    const accountId = (leads.schema as unknown as { fields: { name: string; relation?: { targetTable: string } }[] }).fields
      .find((f) => f.name === 'accountId');
    expect(accountId?.relation?.targetTable).toBe(accounts.id);

    const again = await request(app).post('/api/dashboard/modules/install').set(authHeader(u as never)).send({ moduleKey: 'CRM-2' });
    expect(again.body.data).toEqual({ status: 'already-installed', tables: ['crmAccounts', 'crmContacts'], synced: [] });
  });

  it('c8: não-admin → 403; body inválido → 400', async () => {
    const u = await novoUsuario('USER');
    expect((await request(app).post('/api/dashboard/modules/install').set(authHeader(u as never)).send({ moduleKey: 'CRM-2' })).status).toBe(403);
    const a = await novoUsuario('ADMIN');
    expect((await request(app).post('/api/dashboard/modules/install').set(authHeader(a as never)).send({ moduleKey: 'X' })).status).toBe(400);
  });

  it('F-I8-COMP3-b: tenant legado (leads vindos do Core antigo) → sync-preset acha as 5 definições e não altera linhas', async () => {
    const u = await novoUsuario('ADMIN');
    // O Core antigo = Core atual + as 5 tabelas de lead (mesmos módulos, mesma fábrica) — é o que um tenant
    // criado antes do I8 tem instalado.
    const legado = { tables: { ...CoreSystemPreset.tables, ...composeModuleTables(['CRM-0', 'CRM-1']), ...BeautySalonPreset.tables } };
    const dts = getFactory().getDynamicTableService();
    await dts.installPresetAsSystem(u.id, legado);
    const unitsT = (await tabela(u.id, 'units'))!;
    const ctx = { id: u.id, userId: u.id, role: 'ADMIN' } as never;
    const unitRow = await dts.createTableData(ctx, unitsT.id, { data: { name: 'Matriz' } });
    const leadsT = (await tabela(u.id, 'leads'))!;
    const stage = (await linhasDe(u.id, 'leadStages'))[0];
    await dts.createTableData(ctx, leadsT.id, { data: { unitId: unitRow.id, leadName: 'Maria', phone: '11999990000', pipelineId: (stage.data as { pipelineId: string }).pipelineId, stageId: stage.id, status: 'Open' } });

    const antes: Record<string, unknown> = {};
    for (const x of [...LEADS, 'tasks']) antes[x] = await linhasDe(u.id, x);
    expect((antes.leads as unknown[]).length).toBe(1);

    const sync = getFactory().getPresetSyncService();
    for (const x of LEADS) {
      await expect(sync.syncInstalledTableFromPreset(ctx, x)).resolves.toEqual({ added: [], optionsAdded: {} });
    }
    for (const x of [...LEADS, 'tasks']) expect(await linhasDe(u.id, x)).toEqual(antes[x]);
  });
});
