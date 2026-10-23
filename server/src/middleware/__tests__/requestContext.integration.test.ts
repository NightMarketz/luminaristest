/**
 * requestContextMiddleware over the REAL app (nó OBS, items 2–5). Asserts on the FORMATTED log line
 * (console spy), not on the logger call: the context is merged inside formatLog, so a spy on
 * `logger.warn` would see the call without the context and prove nothing.
 */
import request from 'supertest';
import { makeApp, disconnectDb, authHeader, pushTestSchema } from '@test/helpers';

const app = makeApp();

// The authenticated case reads the users table (token version) — without the schema a fresh CI DB
// answers 401 instead of reaching the self-update check.
beforeAll(() => pushTestSchema(), 120000);

afterAll(async () => {
  await disconnectDb();
});

/** Every JSON line written to console.log/console.error while `fn` runs. */
async function captureLines(fn: () => Promise<unknown>): Promise<Record<string, unknown>[]> {
  const lines: Record<string, unknown>[] = [];
  const collect = (raw: unknown) => {
    try {
      lines.push(JSON.parse(String(raw)));
    } catch {
      // not a logger line
    }
  };
  const logSpy = jest.spyOn(console, 'log').mockImplementation(collect);
  const errSpy = jest.spyOn(console, 'error').mockImplementation(collect);
  try {
    await fn();
  } finally {
    logSpy.mockRestore();
    errSpy.mockRestore();
  }
  return lines;
}

describe('requestContextMiddleware (real app, supertest)', () => {
  it('answers with a generated X-Request-Id', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reuses a valid inbound x-request-id and replaces an invalid one', async () => {
    const kept = await request(app).get('/health').set('x-request-id', 'abc-12345678');
    expect(kept.headers['x-request-id']).toBe('abc-12345678');

    const replaced = await request(app).get('/health').set('x-request-id', 'bad id {"level":"error"}');
    expect(replaced.headers['x-request-id']).not.toContain('bad');
    expect(replaced.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('a log line written after the JSON body parser and auth carries requestId, route and userId', async () => {
    let requestId = '';
    const lines = await captureLines(async () => {
      const res = await request(app)
        .put('/api/users/someone-else?cpf=12345678900')
        .set(authHeader({ id: 'obs-user-1', username: 'obs' }))
        .send({ name: 'x' });
      expect(res.status).toBe(403);
      requestId = String(res.headers['x-request-id']);
    });

    const denied = lines.find((l) => l.message === '[authMiddleware] 403: Self-update only');
    expect(denied).toMatchObject({
      level: 'warn',
      event: 'auth.denied',
      requestId,
      method: 'PUT',
      route: '/api/users/someone-else',
      userId: 'obs-user-1',
    });

    const timing = lines.find((l) => l.message === 'Metric: http_request');
    expect(timing).toMatchObject({ event: 'http.request', requestId, path: '/api/users/someone-else', userId: 'obs-user-1' });
    expect(JSON.stringify(lines)).not.toContain('12345678900');
  });

  it('an invalid token is a warn with the route, without the raw JWT error message', async () => {
    const lines = await captureLines(async () => {
      const res = await request(app).get('/api/dynamic-tables').set('Authorization', 'Bearer not-a-jwt');
      expect(res.status).toBe(401);
    });
    const line = lines.find((l) => l.message === '[authMiddleware] 401: Invalid or expired token');
    expect(line).toMatchObject({ level: 'warn', event: 'auth.denied', route: '/api/dynamic-tables' });
    expect(JSON.stringify(line)).not.toContain('jwt malformed');
  });
});
