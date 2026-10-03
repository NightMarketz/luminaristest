import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bpToPercent, fixedAssetsService, percentToBp } from '../fixedAssets.service';
import { accountingService } from '../accounting.service';
import { notify } from '../../notifications/notify';

/**
 * fixedAssets.service — FE-INCR-FIXED-ASSETS item 2–5: os DOIS DELETEs levam o alvo no CORPO JSON (o BE lê
 * `req.body`; sem corpo = 400) com `assetId`/`classId` = `:id` do path; `includeHidden` vai `'true'` ou é omitido
 * (nunca `'false'` — `queryBoolean`); `/settings` recebe o PUT parcial; só mutações notificam.
 */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

function okResponse(data: unknown): Response {
  return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) } as unknown as Response;
}

function lastCall(): { url: string; init: RequestInit } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, init };
}

describe('percentToBp / bpToPercent', () => {
  it('converte % ↔ basis points sem erro de ponto flutuante', () => {
    expect(percentToBp('33,3')).toBe(3330);
    expect(percentToBp('33.3')).toBe(3330);
    expect(percentToBp('10')).toBe(1000);
    expect(percentToBp(' 0,01 ')).toBe(1);
    expect(bpToPercent(3330)).toBe('33,3');
    expect(bpToPercent(1000)).toBe('10');
    expect(bpToPercent(1)).toBe('0,01');
  });

  it('entrada vazia ou não numérica é NaN (o chamador valida o intervalo)', () => {
    expect(percentToBp('')).toBeNaN();
    expect(percentToBp('abc')).toBeNaN();
  });
});

describe('fixedAssetsService', () => {
  beforeEach(() => {
    vi.mocked(notify).mockReset();
    globalThis.fetch = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse([]));
  });

  it('deleteAsset: DELETE com corpo { unitId, assetId = :id }', async () => {
    await fixedAssetsService.deleteAsset('a1', 'u1');
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/fixed-assets\/a1$/);
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ unitId: 'u1', assetId: 'a1' });
  });

  it('deleteClass: DELETE com corpo { unitId, classId = :id }', async () => {
    await fixedAssetsService.deleteClass('c1', 'u1');
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/fixed-asset-classes\/c1$/);
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ unitId: 'u1', classId: 'c1' });
  });

  it('listAssets: status/classId só quando informados', async () => {
    await fixedAssetsService.listAssets({ unitId: 'u1' });
    expect(lastCall().url).toMatch(/\/accounting\/fixed-assets\?unitId=u1$/);
    await fixedAssetsService.listAssets({ unitId: 'u1', status: 'ACTIVE', classId: 'c1' });
    expect(lastCall().url).toMatch(/\?unitId=u1&status=ACTIVE&classId=c1$/);
    expect(notify).not.toHaveBeenCalled();
  });

  it('listRates: includeHidden só como "true", nunca "false"', async () => {
    await fixedAssetsService.listRates('u1', false);
    expect(lastCall().url).toMatch(/\/accounting\/depreciation-rates\?unitId=u1$/);
    await fixedAssetsService.listRates('u1', true);
    expect(lastCall().url).toMatch(/includeHidden=true$/);
  });

  it('updateAsset é PUT; activate/dispose/run/reconcile/hide são POST com o corpo do comando', async () => {
    await fixedAssetsService.updateAsset('a1', { unitId: 'u1', assetId: 'a1', code: 'X' });
    expect(lastCall().init.method).toBe('PUT');
    expect(lastCall().url).toMatch(/\/fixed-assets\/a1$/);

    await fixedAssetsService.activateAsset('a1', { unitId: 'u1', assetId: 'a1', activatedAt: '2026-01-01', version: 3 });
    expect(lastCall().url).toMatch(/\/fixed-assets\/a1\/activate$/);
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ unitId: 'u1', assetId: 'a1', activatedAt: '2026-01-01', version: 3 });

    await fixedAssetsService.runDepreciation({ unitId: 'u1', yearMonth: '2026-09' });
    expect(lastCall().url).toMatch(/\/fixed-assets\/depreciation\/run$/);

    await fixedAssetsService.reconcile('u1');
    expect(lastCall().url).toMatch(/\/fixed-assets\/reconcile$/);
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ unitId: 'u1' });

    await fixedAssetsService.hideRate('r1', 'u1');
    expect(lastCall().url).toMatch(/\/depreciation-rates\/r1\/hide$/);
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ unitId: 'u1' });
  });
});

describe('accountingService settings', () => {
  beforeEach(() => {
    vi.mocked(notify).mockReset();
    globalThis.fetch = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({ unitId: 'u1' }));
  });

  it('getSettings: GET /accounting/settings?unitId', async () => {
    await accountingService.getSettings('u1');
    expect(lastCall().url).toMatch(/\/accounting\/settings\?unitId=u1$/);
    expect(lastCall().init.method).toBe('GET');
  });

  it('updateSettings: PUT com o corpo parcial exatamente como recebido (null limpa)', async () => {
    await accountingService.updateSettings({ unitId: 'u1', depreciationExpenseAccountId: 'acc-1', disposalGainAccountId: null });
    expect(lastCall().init.method).toBe('PUT');
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ unitId: 'u1', depreciationExpenseAccountId: 'acc-1', disposalGainAccountId: null });
  });
});
