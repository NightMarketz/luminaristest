/**
 * httpTimingMiddleware over the REAL app (BRIEF-W2-D, F4, layer 2 — gate de saída: "middleware
 * HTTP testado via supertest (res.on('finish') dispara mesmo em erro 4xx/5xx)"). Drives the full
 * middleware stack (helmet -> cors -> compression -> httpTiming -> json -> ... -> authMiddleware
 * -> routes) exactly as production runs it — no DB writes here, so no schema/reset needed.
 */
import request from 'supertest';
import { makeApp, disconnectDb } from '@test/helpers';
import { logger } from '@/lib/logger';

const app = makeApp();

afterAll(async () => {
  await disconnectDb();
});

describe('httpTimingMiddleware (real app, supertest)', () => {
  it('logs Metric: http_request with a numeric duration for a 2xx-ish response', async () => {
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    await request(app).get('/health');

    const call = infoSpy.mock.calls.find((c) => c[0] === 'Metric: http_request');
    expect(call).toBeDefined();
    const ctx = call![1] as Record<string, unknown>;
    expect(typeof ctx.duration).toBe('number');
    expect(ctx.method).toBe('GET');
    expect(ctx.path).toBe('/health');
    infoSpy.mockRestore();
  });

  it("res.on('finish') fires even on a 401 (auth-denied route) — the metric is still logged", async () => {
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    const res = await request(app).get('/api/dynamic-tables');
    expect(res.status).toBe(401);

    const call = infoSpy.mock.calls.find((c) => c[0] === 'Metric: http_request' && (c[1] as { path?: string }).path === '/api/dynamic-tables');
    expect(call).toBeDefined();
    const ctx = call![1] as Record<string, unknown>;
    expect(ctx.statusCode).toBe(401);
    expect(typeof ctx.duration).toBe('number');
    infoSpy.mockRestore();
  });

  it("res.on('finish') fires even on a 404 (unmatched route, outside /api so auth never intercepts it)", async () => {
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    const res = await request(app).get('/this-route-does-not-exist');
    expect(res.status).toBe(404);

    const call = infoSpy.mock.calls.find((c) => c[0] === 'Metric: http_request');
    expect(call).toBeDefined();
    const ctx = call![1] as Record<string, unknown>;
    expect(ctx.statusCode).toBe(404);
    infoSpy.mockRestore();
  });
});
