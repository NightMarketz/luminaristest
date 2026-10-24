/**
 * accessLogMiddleware over the REAL app (nó OBS, Fase B, item 11). Reads the access-log file on disk —
 * that file is the Marco Civil record, so the assertion is on what lands there, not on a call.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { makeApp, disconnectDb, authHeader, pushTestSchema } from '@test/helpers';
import { AccessLogRecordSchema, type AccessLogRecord } from '../../lib/accessLog';

const app = makeApp();
let dir: string;

// authMiddleware reads the users table (token version); without the schema a fresh DB answers 401.
beforeAll(() => pushTestSchema(), 120000);

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'luminaris-access-it-'));
  process.env.LOG_ACCESS_DIR = dir;
});

afterEach(() => {
  delete process.env.LOG_ACCESS_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
});

afterAll(async () => {
  await disconnectDb();
});

/** Every record written to any day-file, validated against the contract. */
function records(): AccessLogRecord[] {
  return fs
    .readdirSync(dir)
    .filter((n) => n.startsWith('access-'))
    .flatMap((n) => fs.readFileSync(path.join(dir, n), 'utf8').split('\n').filter(Boolean))
    .map((l) => AccessLogRecordSchema.parse(JSON.parse(l)));
}

/** `finish` fires after supertest resolves on some runs; give the listener one turn. */
const settle = () => new Promise((r) => setImmediate(r));

describe('accessLogMiddleware (real app, supertest)', () => {
  it('an authenticated request writes one record with ip, userId, method, route without query and requestId', async () => {
    const res = await request(app)
      .put('/api/users/someone-else?cpf=12345678900')
      .set(authHeader({ id: 'acc-user-1', username: 'acc' }))
      .send({ name: 'x', cpf: '12345678900' });
    expect(res.status).toBe(403);
    await settle();

    const written = records();
    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({
      userId: 'acc-user-1',
      method: 'PUT',
      route: '/api/users/someone-else',
      requestId: String(res.headers['x-request-id']),
      port: null,
    });
    expect(written[0].ip).not.toBe('');
    expect(fs.readdirSync(dir).map((n) => fs.readFileSync(path.join(dir, n), 'utf8')).join('')).not.toContain('12345678900');
  });

  it('takes the source port from X-Client-Port and drops an invalid one to null', async () => {
    await request(app).get('/api/users/acc-user-2').set(authHeader({ id: 'acc-user-2', username: 'acc2' })).set('X-Client-Port', '40123');
    await request(app).get('/api/users/acc-user-2').set(authHeader({ id: 'acc-user-2', username: 'acc2' })).set('X-Client-Port', 'evil');
    await settle();

    expect(records().map((r) => r.port)).toEqual([40123, null]);
  });

  it('writes nothing for an unauthenticated request or an invalid token', async () => {
    await request(app).get('/health');
    await request(app).get('/api/dynamic-tables').set('Authorization', 'Bearer not-a-jwt');
    await settle();

    expect(records()).toHaveLength(0);
  });
});
