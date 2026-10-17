import { describe, it, expect, vi, beforeEach } from 'vitest';
import { simplesService } from '../simples.service';

/** FE-INCR-SIMPLES PR-D — URL, método e corpo exatos das rotas anuais e de alíquotas (server/src/routes/simples.ts:42-46). */
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

describe('simplesService — PR-D', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({ ano: 2026 }));
  });

  it('obterAliquotas: GET /accounting/simples/aliquotas/:competencia?unitId=', async () => {
    await simplesService.obterAliquotas('2026-03', { unitId: 'u 1' });
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/simples\/aliquotas\/2026-03\?unitId=u%201$/);
    expect(init.method).toBe('GET');
  });

  it('obterDasnSimei / salvarDasnSimei: GET e PUT /dasn-simei/:ano', async () => {
    await simplesService.obterDasnSimei(2026, { unitId: 'u1' });
    expect(lastCall().url).toMatch(/\/accounting\/simples\/dasn-simei\/2026\?unitId=u1$/);
    await simplesService.salvarDasnSimei(2026, { unitId: 'u1', contratouEmpregado: false });
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/simples\/dasn-simei\/2026$/);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({ unitId: 'u1', contratouEmpregado: false });
  });

  it('obterDefis / salvarDefis: GET e PUT /defis/:ano com o corpo inteiro', async () => {
    const out = await simplesService.obterDefis(2026, { unitId: 'u1' });
    expect(lastCall().url).toMatch(/\/accounting\/simples\/defis\/2026\?unitId=u1$/);
    expect(out).toEqual({ ano: 2026 });
    const body = {
      unitId: 'u1', empregadosInicio: 0, empregadosFim: 0, ganhosCapitalCents: 0, ganhosRendaVariavelCents: 0, exportacaoDiretaCents: 0,
      exportacaoComercial: [], cotasTesourariaBp: 0, socios: [], doacoesEleitorais: [],
    };
    await simplesService.salvarDefis(2026, body);
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/simples\/defis\/2026$/);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual(body);
  });

  it('o 400 do BE (ano ≥ 2027) propaga com a mensagem — a tela mostra o texto', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(errResponse(400, { error: 'A DEFIS espelho cobre até o ano-calendário 2026' }));
    await expect(simplesService.obterDefis(2027, { unitId: 'u1' })).rejects.toMatchObject({ status: 400 });
  });
});
