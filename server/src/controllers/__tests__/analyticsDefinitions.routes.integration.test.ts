/**
 * HTTP / contract tests for the analytics-definitions write routes — real Express app over
 * supertest + real DB.
 *
 * This is the barrier for AV-L1 finding F2 (`avl1-analyticsdefs-sem-parse-runtime`): the controller
 * used to hand `req.body` straight to `DynamicTableService` with no parse at the HTTP boundary.
 *
 * The trap these tests are built around: BOTH the DTO rejection and the "CORE table missing" branch
 * answer 400, so asserting on the status alone would pass even with the guard deleted. Every case
 * below asserts on the SHAPE of `error` — a zod `flatten()` payload carries `fieldErrors`, the table
 * branch is a plain string — and the last case is the control that proves the two are distinguishable.
 *
 * Run via `npm run test:integration`.
 */
import request from 'supertest';
import { makeApp, pushTestSchema, resetDb, disconnectDb, seedUser, authHeader } from '@test/helpers';

const app = makeApp();

/** A body the DTO accepts: every preset-required field that has no engine-side default. */
const VALID_BODY = {
  key: 'revenue-by-month',
  title: 'Revenue by month',
  chartType: 'bar',
  pipeline: { source: 'sales', groupBy: 'month' },
};

/** True when the 400 came from the Zod boundary, false when it came from any other branch. */
const isDtoRejection = (body: { error?: unknown }) =>
  typeof body.error === 'object' && body.error !== null && 'fieldErrors' in (body.error as object);

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe('POST /api/analytics/definitions', () => {
  it('401s without a token', async () => {
    const res = await request(app).post('/api/analytics/definitions').send(VALID_BODY);
    expect(res.status).toBe(401);
  });

  it('400s at the DTO when required fields are missing', async () => {
    const u = await seedUser({ username: 'u' });
    const res = await request(app)
      .post('/api/analytics/definitions')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({ title: 'no key, no chartType, no pipeline' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(isDtoRejection(res.body)).toBe(true);
    expect(res.body.error.fieldErrors).toHaveProperty('key');
    expect(res.body.error.fieldErrors).toHaveProperty('chartType');
    expect(res.body.error.fieldErrors).toHaveProperty('pipeline');
  });

  it('400s at the DTO when chartType is outside the preset enum', async () => {
    const u = await seedUser({ username: 'u' });
    const res = await request(app)
      .post('/api/analytics/definitions')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({ ...VALID_BODY, chartType: 'sunburst' });

    expect(res.status).toBe(400);
    expect(isDtoRejection(res.body)).toBe(true);
    expect(res.body.error.fieldErrors).toHaveProperty('chartType');
  });

  it('400s at the DTO when pipeline is a bare primitive instead of a JSON block', async () => {
    const u = await seedUser({ username: 'u' });
    const res = await request(app)
      .post('/api/analytics/definitions')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({ ...VALID_BODY, pipeline: 'not-json' });

    expect(res.status).toBe(400);
    expect(isDtoRejection(res.body)).toBe(true);
    expect(res.body.error.fieldErrors).toHaveProperty('pipeline');
  });

  it('400s at the DTO when a datetime field is not a date', async () => {
    // Was the residue of the F2 class: `createdAt`/`updatedAt` are `datetime` in the preset but were
    // typed `z.string()` here, so garbage cleared the boundary and died in the engine — the exact
    // "error from the wrong layer" this finding exists to remove.
    const u = await seedUser({ username: 'u' });
    const res = await request(app)
      .post('/api/analytics/definitions')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({ ...VALID_BODY, createdAt: 'banana' });

    expect(res.status).toBe(400);
    expect(isDtoRejection(res.body)).toBe(true);
    expect(res.body.error.fieldErrors).toHaveProperty('createdAt');
  });

  it('400s at the DTO when a datetime field is an explicit null, instead of coercing it to the epoch', async () => {
    // Regression guard. A plain `z.coerce.date()` ACCEPTS null and rewrites it to 1970-01-01,
    // because `new Date(null)` is the epoch and `.optional()` only excuses `undefined`. That turned
    // a loud 400 into a quietly wrong stored value. If this case ever goes green with a 2xx, the
    // input guard in `DateTimeField` has been simplified away.
    const u = await seedUser({ username: 'u' });
    const res = await request(app)
      .post('/api/analytics/definitions')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({ ...VALID_BODY, createdAt: null });

    expect(res.status).toBe(400);
    expect(isDtoRejection(res.body)).toBe(true);
    expect(res.body.error.fieldErrors).toHaveProperty('createdAt');
  });

  it('400s at the DTO when a relation field is not a cuid', async () => {
    const u = await seedUser({ username: 'u' });
    const res = await request(app)
      .post('/api/analytics/definitions')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({ ...VALID_BODY, createdBy: 'not-a-cuid' });

    expect(res.status).toBe(400);
    expect(isDtoRejection(res.body)).toBe(true);
    expect(res.body.error.fieldErrors).toHaveProperty('createdBy');
  });

  it('CONTROL: well-formed datetime and cuid values clear the DTO (format only, not existence)', async () => {
    // Pairs with the cases above — proves they reject bad values, not the fields themselves.
    //
    // Two honest limits. (1) `createdBy` is a `relation` to the EMPLOYEES table, so a real value is
    // the id of a DynamicTableData row, not of a User; `u.id` is right in FORMAT and wrong in
    // meaning, and passes only because nothing downstream checks that the relation exists. (2) it
    // is a cuid only because Prisma mints cuids today — if the schema moved to uuid this would go
    // red, and so would the DTO and the engine, since both hardcode `.cuid()`. The red would be
    // real; the test name is where the confusion would be, so it says so here.
    const u = await seedUser({ username: 'u' });
    const res = await request(app)
      .post('/api/analytics/definitions')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({ ...VALID_BODY, createdAt: '2026-07-31T12:00:00.000Z', createdBy: u.id });

    expect(isDtoRejection(res.body)).toBe(false);
  });

  it('400s at the DTO on an unknown field (.strict) instead of dropping it silently', async () => {
    const u = await seedUser({ username: 'u' });
    const res = await request(app)
      .post('/api/analytics/definitions')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({ ...VALID_BODY, chartTyp: 'bar' });

    expect(res.status).toBe(400);
    expect(isDtoRejection(res.body)).toBe(true);
  });

  it('CONTROL: a valid body is NOT rejected by the DTO', async () => {
    // Guards against the opposite failure — a boundary so strict it rejects bodies the engine
    // accepts, which would make every assertion above vacuous.
    //
    // Deliberately asserts nothing about the status. What happens AFTER the boundary depends on the
    // environment: `getFactory()` constructs OpenAIService, which throws when the OpenAI key is
    // absent, and `test/jest.setupEnv.ts` sets only DATABASE_URL, NODE_ENV and JWT_SECRET. So this
    // request answers 500 here and would answer 400 ("CORE table not found") in an environment with
    // the key. Both are outside this test's claim; `fieldErrors` is not.
    const u = await seedUser({ username: 'u' });
    const res = await request(app)
      .post('/api/analytics/definitions')
      .set(authHeader({ id: u.id, username: u.username }))
      .send(VALID_BODY);

    expect(isDtoRejection(res.body)).toBe(false);
  });
});

describe('PUT /api/analytics/definitions/:id', () => {
  it('401s without a token', async () => {
    const res = await request(app).put('/api/analytics/definitions/some-id').send({ title: 'x' });
    expect(res.status).toBe(401);
  });

  it('400s at the DTO on an empty body — a write that changes nothing is a client bug', async () => {
    const u = await seedUser({ username: 'u' });
    const res = await request(app)
      .put('/api/analytics/definitions/some-id')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({});

    expect(res.status).toBe(400);
    expect(isDtoRejection(res.body)).toBe(true);
  });

  it('400s at the DTO on a bad field type, while accepting a single-field patch', async () => {
    const u = await seedUser({ username: 'u' });
    const bad = await request(app)
      .put('/api/analytics/definitions/some-id')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({ published: 'yes' });

    expect(bad.status).toBe(400);
    expect(isDtoRejection(bad.body)).toBe(true);

    // CONTROL: the partial shape is genuinely partial — one valid field clears the boundary.
    const ok = await request(app)
      .put('/api/analytics/definitions/some-id')
      .set(authHeader({ id: u.id, username: u.username }))
      .send({ published: false });

    expect(isDtoRejection(ok.body)).toBe(false);
  });
});
