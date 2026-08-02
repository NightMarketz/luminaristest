/**
 * HTTP / contract tests for the analytics routes — real Express app over supertest + real DB.
 *
 * Scope note: resolving a chart/KPI requires seeded dynamic-table data and exercises the engine
 * (covered by the engine/processor specs). These tests lock the contract BOUNDARY: authentication
 * (401) and query-DTO validation (400). The one safe 200 is the drill-down early-return for an empty
 * recordIds set (it answers before touching any table data).
 *
 * Run via `npm run test:integration`.
 */
import request from 'supertest';
import {
  makeApp,
  pushTestSchema,
  resetDb,
  disconnectDb,
  seedUser,
  authHeader,
  seedDynamicTable,
  seedDynamicTableData,
} from '@test/helpers';

const app = makeApp();

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe('GET /api/analytics/data', () => {
  it('401s without a token', async () => {
    const res = await request(app).get('/api/analytics/data?key=revenue');
    expect(res.status).toBe(401);
  });

  it('400s when the required key is missing', async () => {
    const u = await seedUser({ username: 'u' });
    const res = await request(app).get('/api/analytics/data').set(authHeader({ id: u.id, username: u.username }));
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/analytics/drill-down', () => {
  it('401s without a token', async () => {
    const res = await request(app).get('/api/analytics/drill-down?tableId=t1');
    expect(res.status).toBe(401);
  });

  it('400s when tableId is missing', async () => {
    const u = await seedUser({ username: 'u' });
    const res = await request(app).get('/api/analytics/drill-down').set(authHeader({ id: u.id, username: u.username }));
    expect(res.status).toBe(400);
  });

  it('200s with an empty result when no recordIds are given (early return, no table access)', async () => {
    const u = await seedUser({ username: 'u' });
    const res = await request(app)
      .get('/api/analytics/drill-down?tableId=t1')
      .set(authHeader({ id: u.id, username: u.username }));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });
});

/**
 * The custom-KPI route has no frontend caller — these tests ARE its only exercise. The 200 case
 * seeds real rows and asserts the computed number, so a regression in the validate/fetch/execute
 * pipeline fails here rather than silently returning a wrong aggregate.
 */
describe('POST /api/analytics/custom-kpis', () => {
  const AMOUNT_SCHEMA = {
    fields: [
      { name: 'amount', label: 'Amount', type: 'number', required: true },
      { name: 'status', label: 'Status', type: 'string', required: false },
    ],
  };

  it('401s without a token', async () => {
    const res = await request(app)
      .post('/api/analytics/custom-kpis')
      .send({ tableId: 't1', kpis: [{ name: 'k', tableId: 't1', measure: 'count', field: 'amount' }] });
    expect(res.status).toBe(401);
  });

  it('400s when the kpis array is empty', async () => {
    const u = await seedUser({ username: 'u' });
    const res = await request(app)
      .post('/api/analytics/custom-kpis')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({ tableId: 't1', kpis: [] });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('400s when a kpi.tableId does not match the top-level tableId', async () => {
    const u = await seedUser({ username: 'u' });
    const table = await seedDynamicTable({ userId: u.id, schema: AMOUNT_SCHEMA });
    const res = await request(app)
      .post('/api/analytics/custom-kpis')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({
        tableId: table.id,
        kpis: [{ name: 'Wrong table', tableId: 'some-other-table', measure: 'count', field: 'amount' }],
      });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(['Wrong table']);
  });

  it('404s for a table that does not exist', async () => {
    const u = await seedUser({ username: 'u' });
    const res = await request(app)
      .post('/api/analytics/custom-kpis')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({
        tableId: 'missing-table',
        kpis: [{ name: 'k', tableId: 'missing-table', measure: 'count', field: 'amount' }],
      });
    expect(res.status).toBe(404);
  });

  it('400s when a KPI references a field absent from the table schema', async () => {
    const u = await seedUser({ username: 'u' });
    const table = await seedDynamicTable({ userId: u.id, schema: AMOUNT_SCHEMA });
    const res = await request(app)
      .post('/api/analytics/custom-kpis')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({
        tableId: table.id,
        kpis: [{ name: 'Ghost', tableId: table.id, measure: 'sum', field: 'nopeNotAColumn' }],
      });
    expect(res.status).toBe(400);
    expect(res.body.details[0].kpiName).toBe('Ghost');
  });

  it('200s and computes the KPIs over the seeded rows, honouring filters and soft-delete', async () => {
    const u = await seedUser({ username: 'u' });
    const table = await seedDynamicTable({ userId: u.id, schema: AMOUNT_SCHEMA });
    await seedDynamicTableData({ dynamicTableId: table.id, data: { amount: 100, status: 'paid' } });
    await seedDynamicTableData({ dynamicTableId: table.id, data: { amount: 50, status: 'paid' } });
    await seedDynamicTableData({ dynamicTableId: table.id, data: { amount: 7, status: 'open' } });
    await seedDynamicTableData({
      dynamicTableId: table.id,
      data: { amount: 999, status: 'paid' },
      deletedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/analytics/custom-kpis')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({
        tableId: table.id,
        kpis: [
          { name: 'Total', tableId: table.id, measure: 'sum', field: 'amount' },
          {
            name: 'Paid total',
            tableId: table.id,
            measure: 'sum',
            field: 'amount',
            filters: [{ field: 'status', operator: 'eq', value: 'paid' }],
          },
          { name: 'Rows', tableId: table.id, measure: 'count', field: 'amount' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // 999 is soft-deleted and must not appear in any aggregate.
    expect(res.body.data).toEqual([
      { kpiName: 'Total', value: 157, error: null },
      { kpiName: 'Paid total', value: 150, error: null },
      { kpiName: 'Rows', value: 3, error: null },
    ]);
  });
});
