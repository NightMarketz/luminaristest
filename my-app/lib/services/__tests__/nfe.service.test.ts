import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nfeService } from '../nfe.service';
import { notify } from '../../notifications/notify';

/**
 * nfe.service — FE-INCR-NFE V2: FormData carries EXACTLY the server DTO fields (all three DTOs are
 * `.strict()`), `itemMappings` travels as a JSON string, no manual Content-Type, errors come back as
 * `{ ...body, status }` (what `resolveError` reads), and only mutations notify.
 */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

const xml = new File(['<xml/>'], 'nfe.xml', { type: 'text/xml' });

function okResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => ({ success: true, data }) } as unknown as Response;
}

function failResponse(status: number, body: unknown): Response {
  return { ok: false, status, statusText: 'Bad', text: async () => JSON.stringify(body) } as unknown as Response;
}

function lastCall(): { url: string; init: RequestInit; form: FormData } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, init, form: init.body as FormData };
}

describe('nfeService', () => {
  beforeEach(() => {
    vi.mocked(notify).mockReset();
    globalThis.fetch = vi.fn();
  });

  it('previewNfe: POST /nfe/preview with file + unitId only, Bearer header, no Content-Type, no notify', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({ chaveAcesso: 'x' }));
    const out = await nfeService.previewNfe({ unitId: 'u1' }, xml);
    expect(out).toEqual({ chaveAcesso: 'x' });
    const { url, init, form } = lastCall();
    expect(url).toMatch(/\/nfe\/preview$/);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(Array.from(form.keys()).sort()).toEqual(['file', 'unitId']);
    expect(form.get('unitId')).toBe('u1');
    expect(notify).not.toHaveBeenCalled();
  });

  it('importPurchaseNfe: itemMappings as JSON string; optional fields only when given; notifies on success', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({ payable: { id: 'p1' }, ignoredItems: [] }));
    await nfeService.importPurchaseNfe(
      { unitId: 'u1', itemMappings: [{ cProd: 'A', productRef: 'prod-a' }], counterpartyId: 'cp1', dueDate: '2026-09-30' },
      xml,
    );
    const { url, form } = lastCall();
    expect(url).toMatch(/\/nfe\/purchase$/);
    expect(Array.from(form.keys()).sort()).toEqual(['counterpartyId', 'dueDate', 'file', 'itemMappings', 'unitId']);
    expect(form.get('itemMappings')).toBe(JSON.stringify([{ cProd: 'A', productRef: 'prod-a' }]));
    expect(notify).toHaveBeenCalledTimes(1);

    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({ payable: { id: 'p2' }, ignoredItems: [] }));
    await nfeService.importPurchaseNfe({ unitId: 'u1', itemMappings: [{ cProd: 'A', productRef: 'prod-a' }] }, xml);
    expect(Array.from(lastCall().form.keys()).sort()).toEqual(['file', 'itemMappings', 'unitId']);
  });

  it('reconcileSaleNfe: file + unitId + saleId, notifies on success', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({ matched: true, divergences: [] }));
    await nfeService.reconcileSaleNfe({ unitId: 'u1', saleId: 's1' }, xml);
    const { url, form } = lastCall();
    expect(url).toMatch(/\/nfe\/sale$/);
    expect(Array.from(form.keys()).sort()).toEqual(['file', 'saleId', 'unitId']);
    expect(form.get('saleId')).toBe('s1');
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('non-2xx throws the server body with status (what resolveError reads); no notify', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(failResponse(400, { success: false, error: 'NF-e inválida: XML mal-formado.' }));
    await expect(nfeService.previewNfe({ unitId: 'u1' }, xml)).rejects.toMatchObject({
      status: 400,
      error: 'NF-e inválida: XML mal-formado.',
    });
    expect(notify).not.toHaveBeenCalled();
  });
});
