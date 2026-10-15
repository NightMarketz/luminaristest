import { describe, it, expect, vi, beforeEach } from 'vitest';
import { simplesService } from '../simples.service';
import { companyFiscalProfileService } from '../companyFiscalProfile.service';

/** FE-INCR-SIMPLES PR-A — URL e corpo exatos; o 404 `company_fiscal_profile_missing` (e só ele) vira `null`. */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

function okResponse(data?: unknown): Response {
  return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) } as unknown as Response;
}
function errResponse(status: number, body: object): Response {
  return { ok: false, status, statusText: 'x', text: async () => JSON.stringify({ success: false, ...body }) } as unknown as Response;
}
function lastCall(): { url: string; init: RequestInit } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, init };
}

describe('simplesService', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({ regime: 'MEI', competencia: '2026-03' }));
  });

  it('obterApuracao: GET /accounting/simples/apuracoes/:competencia?unitId=', async () => {
    const out = await simplesService.obterApuracao('2026-03', { unitId: 'u 1' });
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/simples\/apuracoes\/2026-03\?unitId=u%201$/);
    expect(init.method).toBe('GET');
    expect(out).toMatchObject({ regime: 'MEI' });
  });

  it('calcularApuracao: POST …/calcular com { unitId }', async () => {
    await simplesService.calcularApuracao('2026-03', { unitId: 'u1' });
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/simples\/apuracoes\/2026-03\/calcular$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ unitId: 'u1' });
  });
});

describe('companyFiscalProfileService', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('get: GET /accounting/company-fiscal-profile/:ano?unitId=', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({ ano: 2026, regime: 'MEI' }));
    expect(await companyFiscalProfileService.get(2026, 'u1')).toMatchObject({ regime: 'MEI' });
    expect(lastCall().url).toMatch(/\/accounting\/company-fiscal-profile\/2026\?unitId=u1$/);
  });

  it('get: 404 company_fiscal_profile_missing → null; outro 404 rejeita', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(errResponse(404, { error: 'company_fiscal_profile_missing', message: 'x' }));
    expect(await companyFiscalProfileService.get(2026, 'u1')).toBeNull();
    vi.mocked(globalThis.fetch).mockResolvedValue(errResponse(404, { error: 'Not found' }));
    await expect(companyFiscalProfileService.get(2026, 'u1')).rejects.toMatchObject({ status: 404 });
  });

  it('put: PUT /accounting/company-fiscal-profile/:ano com o corpo inteiro', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({ ano: 2026 }));
    await companyFiscalProfileService.put(2026, { unitId: 'u1', regime: 'MEI', meiContribuinteIss: true });
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/company-fiscal-profile\/2026$/);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({ unitId: 'u1', regime: 'MEI', meiContribuinteIss: true });
  });
});
