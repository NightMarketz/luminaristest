import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accountingKitService } from '../accountingKit.service';

/** accountingKit.service — EMENDA-2 da LAC-B item 1: URL, query e desembrulho do `data`. */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

function okResponse(data?: unknown): Response {
  return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) } as unknown as Response;
}
function lastCall(): { url: string; init: RequestInit } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, init };
}

describe('accountingKitService', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('getKit: GET /accounting-kit com unitId; devolve o data (inclusive null)', async () => {
    const view = { kitKey: 'beautySalon', kitVersion: 6, latestVersion: 6, status: 'INSTALLED', lastRun: null, openPendingCount: 0, changelog: [], steps: { lastCompletedStep: 7, warnings: [] } };
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse(view));
    await expect(accountingKitService.getKit('u 1')).resolves.toEqual(view);
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting-kit\?unitId=u\+1$/);
    expect(init.method).toBe('GET');

    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse(null));
    await expect(accountingKitService.getKit('u1')).resolves.toBeNull();
  });

  it('listPending: GET /accounting-kit/pending com unitId e status opcional; devolve o data', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse([]));
    await expect(accountingKitService.listPending('u1', 'OPEN')).resolves.toEqual([]);
    expect(lastCall().url).toMatch(/\/accounting-kit\/pending\?unitId=u1&status=OPEN$/);
    await accountingKitService.listPending('u1');
    expect(lastCall().url).toMatch(/\/accounting-kit\/pending\?unitId=u1$/);
  });

  it.each([
    ['acceptPending', 'accept'],
    ['rejectPending', 'reject'],
  ] as const)('%s (PR-2 item 15): POST /accounting-kit/pending/:id/%s com unitId e motivo; devolve o data', async (fn, verb) => {
    const view = { id: 'p 1', status: verb === 'accept' ? 'ACCEPTED' : 'REJECTED' };
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse(view));
    const body = { unitId: 'u1', motivo: 'conferido com o contador' };
    await expect(accountingKitService[fn]('p 1', body)).resolves.toEqual(view);
    const { url, init } = lastCall();
    expect(url).toMatch(new RegExp(`/accounting-kit/pending/p%201/${verb}$`));
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual(body);
  });
});
