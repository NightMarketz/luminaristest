/**
 * Unit tests for the fire-and-forget alert webhook. Covers: no-op when ALERT_WEBHOOK_URL is
 * unset, POSTs the payload as JSON when set, never propagates on fetch rejection / non-2xx
 * (collapses to a single logger.warn), and respects the short timeout (fake timers).
 */
import { sendAlertWebhook, type AlertPayload } from '../alertWebhook';
import { logger } from '../logger';

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
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
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
    expect(warnSpy.mock.calls[0][0]).toBe('alert webhook failed');
    expect(warnSpy.mock.calls[0][1]).toMatchObject({
      url: 'https://alerts.example.com/hook',
      source: 'accounting_sync_reconcile',
      event: 'reconcile_summary',
      errorMessage: 'ECONNREFUSED',
    });
  });

  it('never propagates on a non-2xx response — collapses to a single logger.warn', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://alerts.example.com/hook';
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response);

    sendAlertWebhook(payload());
    await flushMicrotasks();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toBe('alert webhook failed');
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
    expect(warnSpy.mock.calls[0][1]).toMatchObject({ errorName: 'AbortError' });
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
