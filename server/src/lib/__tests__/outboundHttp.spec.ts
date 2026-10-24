/**
 * ADR-OBSERVABILIDADE §6 item 5 (F-OBS-16 a): the P5 wrapper. `fetch` is faked; the line is read as written to the
 * console and parsed against LogEntrySchema (the request context is merged inside formatLog).
 */
import { outboundFetch } from '../outboundHttp';
import { LogEntrySchema } from '../logEvents';

describe('outboundFetch', () => {
  let fetchSpy: jest.SpyInstance;
  let out: jest.SpyInstance;
  beforeEach(() => {
    out = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    out.mockRestore();
  });
  const lines = () => out.mock.calls.map((c) => LogEntrySchema.parse(JSON.parse(c[0] as string)));

  it('a 2xx logs integration.call at info with status and duration, and never the URL or the bodies', async () => {
    const response = new Response('{"secret":"resp-body"}', { status: 200 });
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(response);

    const res = await outboundFetch('mercado_pago', 'https://api.example.com/v1/orders?token=abc', {
      method: 'post',
      headers: { Authorization: 'Bearer tok-123' },
      body: '{"payer":"req-body"}',
    });

    expect(res).toBe(response);
    expect(lines()).toEqual([
      expect.objectContaining({
        level: 'info', event: 'integration.call', integration: 'mercado_pago', method: 'POST', status: 200,
        durationMs: expect.any(Number),
      }),
    ]);
    const raw = String(out.mock.calls[0][0]);
    for (const leak of ['api.example.com', 'token=abc', 'tok-123', 'req-body', 'resp-body']) expect(raw).not.toContain(leak);
  });

  it('a non-2xx logs integration.call at warn and still hands the response to the caller', async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 503 }));

    const res = await outboundFetch('bcb_ptax', 'https://olinda.example/x');

    expect(res.status).toBe(503);
    expect(lines()).toEqual([
      expect.objectContaining({ level: 'warn', event: 'integration.call', integration: 'bcb_ptax', method: 'GET', status: 503 }),
    ]);
  });

  it('a network failure logs integration.failed at warn and rethrows the same error', async () => {
    const boom = new TypeError('fetch failed');
    fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(boom);

    await expect(outboundFetch('qdrant', 'http://qdrant:6333/healthz')).rejects.toBe(boom);

    const [line] = lines();
    expect(line).toMatchObject({
      level: 'warn', event: 'integration.failed', integration: 'qdrant', method: 'GET', errorName: 'TypeError',
      durationMs: expect.any(Number),
    });
    expect(line).not.toHaveProperty('status');
  });
});
