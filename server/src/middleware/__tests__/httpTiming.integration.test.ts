/**
 * httpTimingMiddleware over the REAL app (BRIEF-W2-D, F4, layer 2 — gate de saída: "middleware
 * HTTP testado via supertest (res.on('finish') dispara mesmo em erro 4xx/5xx)"). Drives the full
 * middleware stack (helmet -> cors -> compression -> httpTiming -> json -> ... -> authMiddleware
 * -> routes) exactly as production runs it — no DB writes here, so no schema/reset needed.
 */
import request from 'supertest';
import { makeApp, disconnectDb } from '@test/helpers';
import { LogEntrySchema, type LogEntry } from '@/lib/logEvents';

const app = makeApp();

afterAll(async () => {
  await disconnectDb();
});

/**
 * The P1 gate line as written to the console, parsed against LogEntrySchema (ADR-OBSERVABILIDADE item 3:
 * it carries `event: 'http.request'`). Read from console, not from a logger spy: the line is built in formatLog.
 */
async function timingLine(run: () => Promise<void>, path: string): Promise<LogEntry & Record<string, unknown>> {
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    await run();
    const lines = spy.mock.calls.map((c) => LogEntrySchema.parse(JSON.parse(c[0] as string)));
    const line = lines.find((l) => l.message === 'Metric: http_request' && l.path === path);
    expect(line).toBeDefined();
    expect(line!.event).toBe('http.request');
    return line!;
  } finally {
    spy.mockRestore();
  }
}

describe('httpTimingMiddleware (real app, supertest)', () => {
  it('logs Metric: http_request with a numeric duration for a 2xx-ish response', async () => {
    const line = await timingLine(async () => {
      await request(app).get('/health');
    }, '/health');
    expect(typeof line.duration).toBe('number');
    expect(line.method).toBe('GET');
  });

  it("res.on('finish') fires even on a 401 (auth-denied route) — the metric is still logged", async () => {
    const line = await timingLine(async () => {
      const res = await request(app).get('/api/dynamic-tables');
      expect(res.status).toBe(401);
    }, '/api/dynamic-tables');
    expect(line.statusCode).toBe(401);
    expect(typeof line.duration).toBe('number');
  });

  it("res.on('finish') fires even on a 404 (unmatched route, outside /api so auth never intercepts it)", async () => {
    const line = await timingLine(async () => {
      const res = await request(app).get('/this-route-does-not-exist');
      expect(res.status).toBe(404);
    }, '/this-route-does-not-exist');
    expect(line.statusCode).toBe(404);
  });
});
