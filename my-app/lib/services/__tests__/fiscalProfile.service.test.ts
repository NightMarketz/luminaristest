import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fiscalProfileService, type UpsertFiscalProfileInput } from '../fiscalProfile.service';
import { notify } from '../../notifications/notify';

/**
 * fiscalProfile.service — FE-INCR-DFE PR-0 item 1: URL e corpo exatos por método; o 404 `fiscal_profile_missing` vira
 * `null` (e SÓ ele); 500 e 404 sem o código rejeitam; o `serviceRef` vai codificado no path.
 */
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

describe('fiscalProfileService', () => {
  beforeEach(() => {
    vi.mocked(notify).mockReset();
    globalThis.fetch = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({}));
  });

  it('getUnitProfile: GET /accounting/fiscal-profile?unitId= (codificado) e devolve a view', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({ unitId: 'u 1', dpsSerie: 7 }));
    const out = await fiscalProfileService.getUnitProfile('u 1');
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/fiscal-profile\?unitId=u%201$/);
    expect(init.method).toBe('GET');
    expect(out).toMatchObject({ dpsSerie: 7 });
  });

  it('getUnitProfile: 404 fiscal_profile_missing → null, sem rejeitar', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(errResponse(404, { error: 'fiscal_profile_missing', message: 'não cadastrado' }));
    await expect(fiscalProfileService.getUnitProfile('u1')).resolves.toBeNull();
  });

  it('getUnitProfile: 500 propaga; 404 de OUTRA causa também propaga (só o código nomeado vira null)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(errResponse(500, { error: 'boom' }));
    await expect(fiscalProfileService.getUnitProfile('u1')).rejects.toMatchObject({ status: 500 });
    vi.mocked(globalThis.fetch).mockResolvedValue(errResponse(404, { error: 'Not Found' }));
    await expect(fiscalProfileService.getUnitProfile('u1')).rejects.toMatchObject({ status: 404 });
  });

  it('putUnitProfile: PUT /accounting/fiscal-profile com o corpo inteiro, devolve a view e notifica', async () => {
    const body: UpsertFiscalProfileInput = { unitId: 'u1', regimeTributario: 'SIMPLES', icmsContribuinte: false, pisCofinsRegime: 'SIMPLES', dpsSerie: 7 };
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({ unitId: 'u1', dpsSerie: 7 }));
    const out = await fiscalProfileService.putUnitProfile(body);
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/fiscal-profile$/);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual(body);
    expect(out).toMatchObject({ dpsSerie: 7 });
    expect(notify).toHaveBeenCalledWith(expect.any(String), 'success', expect.any(String));
  });

  it('listServiceProfiles: GET /accounting/service-fiscal-profiles?unitId=', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse([{ serviceRef: 's1' }]));
    expect(await fiscalProfileService.listServiceProfiles('u1')).toEqual([{ serviceRef: 's1' }]);
    expect(lastCall().url).toMatch(/\/accounting\/service-fiscal-profiles\?unitId=u1$/);
  });

  it('putServiceProfile: PUT /service-fiscal-profiles/:serviceRef (codificado) com o corpo', async () => {
    await fiscalProfileService.putServiceProfile('row/1', { unitId: 'u1', cTribNac: '010701' });
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/service-fiscal-profiles\/row%2F1$/);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({ unitId: 'u1', cTribNac: '010701' });
  });

  it('deleteServiceProfile: DELETE /service-fiscal-profiles/:serviceRef?unitId=', async () => {
    await fiscalProfileService.deleteServiceProfile('s1', 'u1');
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/service-fiscal-profiles\/s1\?unitId=u1$/);
    expect(init.method).toBe('DELETE');
  });
});
