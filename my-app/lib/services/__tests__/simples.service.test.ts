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

describe('simplesService — escritas do PR-B', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({}));
  });

  it('registrarDas: PUT …/apuracoes/:competencia/das com o corpo', async () => {
    await simplesService.registrarDas('2026-03', { unitId: 'u1', numeroDocumento: 'N', valorCents: 100, vencimento: '2026-04-20' });
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/simples\/apuracoes\/2026-03\/das$/);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({ unitId: 'u1', numeroDocumento: 'N', valorCents: 100, vencimento: '2026-04-20' });
  });

  it('parcerias: GET ?unitId, POST, PATCH /:id, DELETE /:id?unitId', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse([]));
    await simplesService.listParcerias({ unitId: 'u1' });
    expect(lastCall().url).toMatch(/\/accounting\/simples\/parcerias\?unitId=u1$/);
    const body = { unitId: 'u1', profissionalContactId: 'e', cotaSalaoBp: 1, naturezaCota: 'GESTAO' as const, homologadoEm: '2026-01-01', sindicato: 'S', vigenteDesde: '2026-01-01', vigenteAte: null };
    await simplesService.criarParceria(body);
    expect(lastCall().init.method).toBe('POST');
    await simplesService.atualizarParceria('p 1', body);
    expect(lastCall().url).toMatch(/\/parcerias\/p%201$/);
    expect(lastCall().init.method).toBe('PATCH');
    await simplesService.removerParceria('p1', { unitId: 'u1' });
    expect(lastCall().url).toMatch(/\/parcerias\/p1\?unitId=u1$/);
    expect(lastCall().init.method).toBe('DELETE');
  });
});

describe('simplesService — entradas do PR-C', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('obterHistorico/obterSegregacao: GET por competência; 404 NOT_FOUND → null; outro 404 rejeita', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({ competencia: '2025-03', receitaBrutaCents: 1 }));
    expect(await simplesService.obterHistorico('2025-03', { unitId: 'u1' })).toMatchObject({ receitaBrutaCents: 1 });
    expect(lastCall().url).toMatch(/\/accounting\/simples\/historico\/2025-03\?unitId=u1$/);
    vi.mocked(globalThis.fetch).mockResolvedValue(errResponse(404, { code: 'NOT_FOUND', message: 'Sem histórico declarado' }));
    expect(await simplesService.obterHistorico('2025-03', { unitId: 'u1' })).toBeNull();
    expect(await simplesService.obterSegregacao('2025-03', { unitId: 'u1' })).toBeNull();
    expect(lastCall().url).toMatch(/\/accounting\/simples\/segregacao\/2025-03\?unitId=u1$/);
    vi.mocked(globalThis.fetch).mockResolvedValue(errResponse(404, { error: 'Route not found' }));
    await expect(simplesService.obterHistorico('2025-03', { unitId: 'u1' })).rejects.toMatchObject({ status: 404 });
  });

  it('salvarHistorico/salvarSegregacao: PUT por competência com o corpo', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({}));
    await simplesService.salvarHistorico('2025-03', { unitId: 'u1', receitaBrutaCents: 10, folhaCents: null });
    expect(lastCall().url).toMatch(/\/historico\/2025-03$/);
    expect(lastCall().init.method).toBe('PUT');
    await simplesService.salvarSegregacao('2025-03', { unitId: 'u1', parcelas: [] });
    expect(lastCall().url).toMatch(/\/segregacao\/2025-03$/);
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ unitId: 'u1', parcelas: [] });
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
