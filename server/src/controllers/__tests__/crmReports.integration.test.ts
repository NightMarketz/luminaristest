/**
 * BE-INCR-CRM-REPORT-BUILDER PR-2 — contrato HTTP do builder (item 10) sobre o SQLite real: CRUD com soft-delete,
 * posse e ADMIN (item 3), preview e run salvo pelo motor real (getTableDataStream), erros nomeados no envelope
 * (`code` + `details`), PTAX lida da tabela do PR-1 (item 24) e o 401 sem token.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { Role } from '@/features/users/models/User.model';
import { makeApp, pushTestSchema, resetDb, disconnectDb, authHeader, seedUser, seedDynamicTable, seedDynamicTableData } from '@test/helpers';

const app = makeApp();
const LEADS_SCHEMA = {
  fields: [
    { name: 'leadName', label: 'Lead', type: 'string' },
    { name: 'status', label: 'Status', type: 'select', options: ['Open', 'Won'] },
    { name: 'latestProposalAmount', label: 'Valor', type: 'number', numberFormat: 'currency' },
    { name: 'latestProposalCurrency', label: 'Moeda', type: 'select', options: ['BRL', 'USD', 'EUR'] },
  ],
};
const chart = (spec: Record<string, unknown>) => ({ name: 'Por status', kind: 'chart', chartType: 'bar', spec });
const BY_STATUS = { source: 'leads', dimensions: [{ type: 'field', field: 'status' }], measures: [{ type: 'count' }] };

describe('BE-INCR-CRM-REPORT-BUILDER — /api/crm/reports', () => {
  let owner: { id: string; username: string };
  let other: { id: string; username: string };
  let admin: { id: string; username: string; role: Role };

  beforeAll(() => pushTestSchema(), 120000);
  beforeEach(async () => {
    owner = await seedUser({ username: 'rb-owner' });
    other = await seedUser({ username: 'rb-other' });
    const a = await seedUser({ username: 'rb-admin', role: Role.ADMIN });
    admin = { id: a.id, username: a.username, role: Role.ADMIN };
    const t = await seedDynamicTable({ userId: owner.id, name: 'Leads', internalName: 'leads', category: 'crm', schema: LEADS_SCHEMA });
    for (const [status, v, c] of [['Open', 100, 'USD'], ['Open', 50, 'BRL'], ['Won', 10, 'BRL']] as const) {
      await seedDynamicTableData({ dynamicTableId: t.id, data: { leadName: status, status, latestProposalAmount: v, latestProposalCurrency: c } });
    }
  });
  afterEach(() => resetDb());
  afterAll(() => disconnectDb());

  it('401 sem token', async () => {
    expect((await request(app).get('/api/crm/reports')).status).toBe(401);
  });

  it('CRUD do dono: cria, lista, lê, edita, roda e apaga (soft-delete)', async () => {
    const c = await request(app).post('/api/crm/reports').set(authHeader(owner)).send(chart(BY_STATUS));
    expect(c.status).toBe(201);
    const id = c.body.data.id as string;
    expect((await request(app).get('/api/crm/reports').set(authHeader(owner))).body.data.map((r: { id: string }) => r.id)).toEqual([id]);
    expect((await request(app).get(`/api/crm/reports/${id}`).set(authHeader(owner))).body.data.spec).toEqual(BY_STATUS);
    expect((await request(app).put(`/api/crm/reports/${id}`).set(authHeader(owner)).send({ name: 'Novo nome' })).body.data.name).toBe('Novo nome');

    const r = await request(app).post(`/api/crm/reports/${id}/run`).set(authHeader(owner)).send({});
    expect(r.status).toBe(200);
    expect(r.body.data.series[0].points.map((p: { name: string; value: number }) => [p.name, p.value])).toEqual([['Open', 2], ['Won', 1]]);
    expect(r.body.data.meta).toEqual({ rowsRead: 3, truncated: false, currency: null, timeZone: 'America/Sao_Paulo' });

    expect((await request(app).delete(`/api/crm/reports/${id}`).set(authHeader(owner))).status).toBe(200);
    expect(await prisma.crmReportDefinition.findUnique({ where: { id } })).toMatchObject({ deletedAt: expect.any(Date) });
    const gone = await request(app).post(`/api/crm/reports/${id}/run`).set(authHeader(owner)).send({});
    expect([gone.status, gone.body.code]).toEqual([404, 'REPORT_NOT_FOUND']);
  });

  it('posse: outro usuário → 404; ADMIN lista, edita sem transferir posse e roda sobre as tabelas do dono', async () => {
    const id = (await request(app).post('/api/crm/reports').set(authHeader(owner)).send(chart(BY_STATUS))).body.data.id as string;
    for (const res of [
      await request(app).get(`/api/crm/reports/${id}`).set(authHeader(other)),
      await request(app).put(`/api/crm/reports/${id}`).set(authHeader(other)).send({ name: 'x' }),
      await request(app).delete(`/api/crm/reports/${id}`).set(authHeader(other)),
    ]) {
      expect([res.status, res.body.code]).toEqual([404, 'REPORT_NOT_FOUND']);
    }
    expect((await request(app).get('/api/crm/reports').set(authHeader(other))).body.data).toEqual([]);
    expect((await request(app).get('/api/crm/reports').set(authHeader(admin))).body.data.map((r: { id: string }) => r.id)).toEqual([id]);
    const up = await request(app).put(`/api/crm/reports/${id}`).set(authHeader(admin)).send({ name: 'pelo admin' });
    expect(up.body.data).toMatchObject({ name: 'pelo admin', userId: owner.id });
    const run = await request(app).post(`/api/crm/reports/${id}/run`).set(authHeader(admin)).send({});
    expect(run.body.data.meta.rowsRead).toBe(3);
  });

  it('preview: erros nomeados no envelope (400 com details, 409 módulo ausente, 400 do DTO)', async () => {
    const mixed = await request(app).post('/api/crm/reports/run').set(authHeader(owner)).send({ spec: { source: 'leads', measures: [{ type: 'sum', field: 'latestProposalAmount' }] } });
    expect([mixed.status, mixed.body.code, mixed.body.details]).toEqual([400, 'REPORT_CURRENCY_MIXED', { field: 'latestProposalAmount', currencyField: 'latestProposalCurrency' }]);
    const field = await request(app).post('/api/crm/reports/run').set(authHeader(owner)).send({ spec: { source: 'leads', dimensions: [{ type: 'field', field: 'nope' }], measures: [{ type: 'count' }] } });
    expect([field.status, field.body.code, field.body.details]).toEqual([400, 'REPORT_FIELD_NOT_FOUND', { field: 'nope' }]);
    const missing = await request(app).post('/api/crm/reports/run').set(authHeader(owner)).send({ spec: { source: 'crmOpportunities', measures: [{ type: 'count' }] } });
    expect([missing.status, missing.body.code]).toEqual([409, 'CRM_MODULE_NOT_INSTALLED']);
    const bad = await request(app).post('/api/crm/reports/run').set(authHeader(owner)).send({ spec: { source: 'leads', measures: [] } });
    expect(bad.status).toBe(400);
    const strict = await request(app).post('/api/crm/reports').set(authHeader(owner)).send({ ...chart(BY_STATUS), userId: other.id });
    expect(strict.status).toBe(400);
  });

  it('item 24: convertTo lê a PTAX guardada (venda) e devolve a visão à parte', async () => {
    await prisma.ptaxRate.create({ data: { currency: 'USD', rateDate: new Date('2026-09-25T00:00:00.000Z'), buyRateE5: 519850, sellRateE5: 519910, quotedAt: new Date('2026-09-25T16:10:00Z'), source: 'BCB_PTAX_FECHAMENTO' } });
    const r = await request(app).post('/api/crm/reports/run').set(authHeader(owner)).send({
      spec: { source: 'leads', dimensions: [{ type: 'field', field: 'latestProposalCurrency' }], measures: [{ type: 'sum', field: 'latestProposalAmount' }], convertTo: 'BRL' },
    });
    expect(r.status).toBe(200);
    expect(r.body.data.series[0].points.map((p: { name: string; value: number }) => [p.name, p.value])).toEqual([['BRL', 60], ['USD', 100]]);
    expect(r.body.data.converted.rates[0]).toMatchObject({ currency: 'USD', rate: 5.1991, rateDate: '2026-09-25', side: 'venda' });
    expect(r.body.data.converted.series[0].points[0].value).toBe(579.91);
  });
});
