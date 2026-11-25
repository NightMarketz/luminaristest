/**
 * Unit tests for the fire-and-forget alert webhook. Covers: no-op when ALERT_WEBHOOK_URL is
 * unset, POSTs the payload as JSON when set, never propagates on fetch rejection / non-2xx
 * (collapses to a single logger.warn), and respects the short timeout (fake timers).
 */
import { deliverAlertWebhook, sendAlertWebhook, type AlertPayload } from '../alertWebhook';
import { LogEntrySchema } from '../logEvents';

/** The warn line as written to the console, parsed against LogEntrySchema (the request context is merged inside formatLog). */
const warned = (spy: jest.SpyInstance) => spy.mock.calls.map((c) => LogEntrySchema.parse(JSON.parse(c[0] as string)));

async function flushMicrotasks(times = 3): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function payload(over: Partial<AlertPayload> = {}): AlertPayload {
  return {
    source: 'accounting_sync_reconcile',
    event: 'reconcile_summary',
    timestamp: '2026-08-30T00:00:00.000Z',
    ...over,
  };
}

describe('sendAlertWebhook', () => {
  const ORIGINAL_URL = process.env.ALERT_WEBHOOK_URL;
  let warnSpy: jest.SpyInstance;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    fetchSpy?.mockRestore();
    if (ORIGINAL_URL === undefined) {
      delete process.env.ALERT_WEBHOOK_URL;
    } else {
      process.env.ALERT_WEBHOOK_URL = ORIGINAL_URL;
    }
    jest.useRealTimers();
  });

  it('is a no-op when ALERT_WEBHOOK_URL is unset — never calls fetch, never warns', async () => {
    delete process.env.ALERT_WEBHOOK_URL;
    fetchSpy = jest.spyOn(global, 'fetch');

    sendAlertWebhook(payload());
    await flushMicrotasks();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('POSTs the exact payload as JSON when ALERT_WEBHOOK_URL is set (reconcile trigger)', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://alerts.example.com/hook';
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response);

    const p = payload({ failed: 2, blocked: 1, runId: 'run-1' });
    sendAlertWebhook(p);
    await flushMicrotasks();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://alerts.example.com/hook');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual(p);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('POSTs the exact payload as JSON for a generation_failed trigger', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://alerts.example.com/hook';
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response);

    const p = payload({
      source: 'sped_ecd',
      event: 'generation_failed',
      jobId: 'job-1',
      kind: 'EXPORT_SPED_ECD',
      unitId: 'unit-1',
      errorName: 'Error',
      errorMessage: 'disk full',
    });
    sendAlertWebhook(p);
    await flushMicrotasks();

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual(p);
  });

  it('never propagates when fetch rejects — collapses to a single logger.warn', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://alerts.example.com/hook';
    fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    expect(() => sendAlertWebhook(payload())).not.toThrow();
    await flushMicrotasks();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warned(warnSpy)[0]).toMatchObject({ level: 'warn', event: 'alert.failed', message: 'alert webhook failed' });
    expect(warned(warnSpy)[0]).toMatchObject({
      urlOrigin: 'https://alerts.example.com',
      source: 'accounting_sync_reconcile',
      alertEvent: 'reconcile_summary',
      errorMessage: 'ECONNREFUSED',
    });
  });

  it('never propagates on a non-2xx response — collapses to a single logger.warn', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://alerts.example.com/hook';
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response);

    sendAlertWebhook(payload());
    await flushMicrotasks();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warned(warnSpy)[0]).toMatchObject({ level: 'warn', event: 'alert.failed', message: 'alert webhook failed' });
  });

  it('aborts after the short timeout and logs a warn — never hangs the caller', async () => {
    jest.useFakeTimers();
    process.env.ALERT_WEBHOOK_URL = 'https://alerts.example.com/hook';
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = (init as RequestInit | undefined)?.signal;
        signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });

    sendAlertWebhook(payload());
    jest.advanceTimersByTime(3000);
    // Let the abort's rejection propagate through the .then/.catch chain under fake timers.
    await flushMicrotasks(5);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warned(warnSpy)[0]).toMatchObject({ errorName: 'AbortError' });
  });

  it('never throws when the payload has a circular reference — collapses to a single logger.warn', () => {
    process.env.ALERT_WEBHOOK_URL = 'https://alerts.example.com/hook';
    fetchSpy = jest.spyOn(global, 'fetch');

    const circular: Record<string, unknown> = payload();
    circular.self = circular; // JSON.stringify throws synchronously on this

    expect(() => sendAlertWebhook(circular as unknown as AlertPayload)).not.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warned(warnSpy)[0]).toMatchObject({ level: 'warn', event: 'alert.failed', message: 'alert webhook failed' });
    expect(warned(warnSpy)[0]).toMatchObject({
      urlOrigin: 'https://alerts.example.com',
      source: 'accounting_sync_reconcile',
      alertEvent: 'reconcile_summary',
    });
  });

  // L-20261124-193344-5803 (OBS-R7): a Slack/Discord/Teams webhook URL carries its secret in the
  // path (and sometimes the query). The alert.failed line may name only the sink's origin.
  describe('never logs the secret path/query of ALERT_WEBHOOK_URL', () => {
    const SECRET_URL = 'https://hooks.example.com/services/T000/SEGREDO?token=QSEGREDO';
    const rawLines = (spy: jest.SpyInstance) => spy.mock.calls.map((c) => String(c[0]));

    it('async path (fetch rejects): logs only the origin', async () => {
      process.env.ALERT_WEBHOOK_URL = SECRET_URL;
      fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      sendAlertWebhook(payload());
      await flushMicrotasks();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(rawLines(warnSpy)[0]).not.toContain('SEGREDO');
      expect(warned(warnSpy)[0]).toMatchObject({ event: 'alert.failed', urlOrigin: 'https://hooks.example.com' });
    });

    it('async path: an error message that echoes the URL is scrubbed to the origin', async () => {
      process.env.ALERT_WEBHOOK_URL = SECRET_URL;
      fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError(`Failed to parse URL from ${SECRET_URL}`));

      sendAlertWebhook(payload());
      await flushMicrotasks();

      expect(rawLines(warnSpy)[0]).not.toContain('SEGREDO');
      expect(warned(warnSpy)[0]).toMatchObject({ errorMessage: 'Failed to parse URL from https://hooks.example.com' });
    });

    it('sync path (circular payload): logs only the origin', () => {
      process.env.ALERT_WEBHOOK_URL = SECRET_URL;
      fetchSpy = jest.spyOn(global, 'fetch');
      const circular: Record<string, unknown> = payload();
      circular.self = circular;

      sendAlertWebhook(circular as unknown as AlertPayload);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(rawLines(warnSpy)[0]).not.toContain('SEGREDO');
      expect(warned(warnSpy)[0]).toMatchObject({ urlOrigin: 'https://hooks.example.com' });
    });

    it('an unparseable URL logs a fixed placeholder, never the raw value', async () => {
      process.env.ALERT_WEBHOOK_URL = 'not a url /SEGREDO';
      fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Failed to parse URL from not a url /SEGREDO'));

      sendAlertWebhook(payload());
      await flushMicrotasks();

      expect(rawLines(warnSpy)[0]).not.toContain('SEGREDO');
      expect(warned(warnSpy)[0]).toMatchObject({ urlOrigin: '[invalid-url]' });
    });
  });

  it('does not abort (and does not warn) when the response arrives before the timeout', async () => {
    jest.useFakeTimers();
    process.env.ALERT_WEBHOOK_URL = 'https://alerts.example.com/hook';
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200 } as Response);

    sendAlertWebhook(payload());
    await flushMicrotasks();
    jest.advanceTimersByTime(3000);
    await flushMicrotasks();

    expect(warnSpy).not.toHaveBeenCalled();
  });
});

/**
 * Lacuna 2374 — `deliverAlertWebhook` é a mesma entrega, aguardável, que devolve o resultado para quem só pode gravar o marcador
 * "já alertei" depois dela. Nunca rejeita; a falha continua saindo UMA vez como `alert.failed`.
 */
describe('deliverAlertWebhook', () => {
  const ORIGINAL_URL = process.env.ALERT_WEBHOOK_URL;
  let logSpy: jest.SpyInstance;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.ALERT_WEBHOOK_URL = 'https://alerts.example.com/hook';
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
    fetchSpy?.mockRestore();
    if (ORIGINAL_URL === undefined) delete process.env.ALERT_WEBHOOK_URL;
    else process.env.ALERT_WEBHOOK_URL = ORIGINAL_URL;
    jest.useRealTimers();
  });

  it("'disabled' sem ALERT_WEBHOOK_URL — não chama fetch, não loga (ausência é configuração válida, não falha)", async () => {
    delete process.env.ALERT_WEBHOOK_URL;
    fetchSpy = jest.spyOn(global, 'fetch');
    await expect(deliverAlertWebhook(payload())).resolves.toBe('disabled');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("'delivered' em 2xx, com o mesmo POST de `sendAlertWebhook`", async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response);
    const p = payload({ pollGaveUp: 1 });
    await expect(deliverAlertWebhook(p)).resolves.toBe('delivered');
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://alerts.example.com/hook');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(p);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("'failed' quando o fetch rejeita — não lança e loga UMA linha `alert.failed`", async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(deliverAlertWebhook(payload())).resolves.toBe('failed');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(warned(logSpy)[0]).toMatchObject({ level: 'warn', event: 'alert.failed', errorMessage: 'ECONNREFUSED' });
  });

  it("'failed' em resposta não-2xx — o endpoint recebeu mas não aceitou", async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response);
    await expect(deliverAlertWebhook(payload())).resolves.toBe('failed');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(warned(logSpy)[0]).toMatchObject({ event: 'alert.failed', errorMessage: 'alert webhook responded with status 503' });
  });

  it("'failed' no timeout curto — nunca pendura quem aguarda", async () => {
    jest.useFakeTimers();
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        (init as RequestInit | undefined)?.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
      });
    });
    const resultado = deliverAlertWebhook(payload());
    jest.advanceTimersByTime(3000);
    await expect(resultado).resolves.toBe('failed');
    expect(warned(logSpy)[0]).toMatchObject({ errorName: 'AbortError' });
  });

  it("'failed' (sem lançar) quando o payload é circular e o `JSON.stringify` explode antes do fetch", async () => {
    fetchSpy = jest.spyOn(global, 'fetch');
    const circular: Record<string, unknown> = payload();
    circular.self = circular;
    await expect(deliverAlertWebhook(circular as unknown as AlertPayload)).resolves.toBe('failed');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
  });
});
