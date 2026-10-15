import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accountingBindingService } from '../accountingBinding.service';

/** accountingBinding.service — LAC-B item 1: URL, query, corpo e desembrulho do `data`. */
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

describe('accountingBindingService', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('listActive: GET /accounting-binding com unitId e status=Active; devolve o data', async () => {
    const rows = [{ id: 'b1', sectorKey: 'beautySalon', bindingVersion: 2, status: 'Active' }];
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse(rows));
    await expect(accountingBindingService.listActive('u 1')).resolves.toEqual(rows);
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting-binding\?unitId=u\+1&status=Active$/);
    expect(init.method).toBe('GET');
  });

  it('activateDefault: POST /accounting-binding/activate-default com o corpo íntegro; devolve o data', async () => {
    const result = { status: 'Active', bindingVersion: 1, kit: { kitKey: 'beautySalon', kitVersion: 5, status: 'INSTALLED' } };
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse(result));
    const body = { unitId: 'u1', sectorKey: 'aestheticClinic', installChartIfEmpty: true, openCurrentPeriodIfMissing: true };
    await expect(accountingBindingService.activateDefault(body)).resolves.toEqual(result);
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting-binding\/activate-default$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual(body);
  });
});
