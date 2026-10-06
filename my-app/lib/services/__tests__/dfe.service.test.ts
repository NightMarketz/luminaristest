import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dfeService } from '../dfe.service';
import { accountingService } from '../accounting.service';

/**
 * dfe.service — FE-INCR-DFE PR-2 item 14: URL, método e corpo exatos por chamada; os multipart levam EXATAMENTE os
 * campos do controller (`file`, `pdf`, `unitId`; `cMotivo` como TEXTO, `xMotivo`); o download do anexo bate em
 * `/accounting/attachments/:id?unitId=` com o nome pedido.
 */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

function okResponse(data?: unknown): Response {
  const body = JSON.stringify({ success: true, data });
  return {
    ok: true,
    status: 200,
    text: async () => body,
    json: async () => JSON.parse(body),
    blob: async () => new Blob(['x']),
  } as unknown as Response;
}
function lastCall(): { url: string; init: RequestInit } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, init };
}
const jsonBody = (init: RequestInit) => JSON.parse(String(init.body));

describe('dfeService', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({}));
  });

  it('getStatus: GET /nfe/dfe/status', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse({ enabled: true, partner: 'manual', ambiente: 'homologacao' }));
    const out = await dfeService.getStatus();
    const { url, init } = lastCall();
    expect(url).toMatch(/\/api\/nfe\/dfe\/status$/);
    expect(init.method).toBe('GET');
    expect(out).toEqual({ enabled: true, partner: 'manual', ambiente: 'homologacao' });
  });

  it('preview e emit: POST com { unitId, saleId, kind } exato', async () => {
    await dfeService.preview({ unitId: 'u1', saleId: 's1', kind: 'NFSE' });
    let { url, init } = lastCall();
    expect(url).toMatch(/\/nfe\/dfe\/preview$/);
    expect(init.method).toBe('POST');
    expect(jsonBody(init)).toEqual({ unitId: 'u1', saleId: 's1', kind: 'NFSE' });

    vi.mocked(globalThis.fetch).mockResolvedValue(okResponse([{ id: 'd1' }, { id: 'd2' }]));
    const docs = await dfeService.emit({ unitId: 'u1', saleId: 's1', kind: 'NFSE' });
    ({ url, init } = lastCall());
    expect(url).toMatch(/\/nfe\/dfe\/documents$/);
    expect(init.method).toBe('POST');
    expect(jsonBody(init)).toEqual({ unitId: 'u1', saleId: 's1', kind: 'NFSE' });
    expect(docs).toHaveLength(2);
  });

  it('listBySale, get e ficha: GET com unitId (e saleId) codificados na query', async () => {
    await dfeService.listBySale('u 1', 's/1');
    expect(lastCall().url).toMatch(/\/nfe\/dfe\/documents\?unitId=u%201&saleId=s%2F1$/);
    await dfeService.get('d/1', 'u1');
    expect(lastCall().url).toMatch(/\/nfe\/dfe\/documents\/d%2F1\?unitId=u1$/);
    await dfeService.ficha('d1', 'u1');
    expect(lastCall().url).toMatch(/\/nfe\/dfe\/documents\/d1\/ficha\?unitId=u1$/);
    expect(lastCall().init.method).toBe('GET');
  });

  it('reenviar e rejeicaoManual: POST com o corpo do DTO', async () => {
    await dfeService.reenviar('d1', { unitId: 'u1' });
    let { url, init } = lastCall();
    expect(url).toMatch(/\/nfe\/dfe\/documents\/d1\/reenviar$/);
    expect(jsonBody(init)).toEqual({ unitId: 'u1' });

    await dfeService.rejeicaoManual('d1', { unitId: 'u1', errors: [{ code: 'E0001', message: 'CNPJ inválido' }] });
    ({ url, init } = lastCall());
    expect(url).toMatch(/\/nfe\/dfe\/documents\/d1\/rejeicao-manual$/);
    expect(jsonBody(init)).toEqual({ unitId: 'u1', errors: [{ code: 'E0001', message: 'CNPJ inválido' }] });
  });

  it('retornoManual: multipart com file, pdf e unitId — e sem pdf quando não há DANFSe', async () => {
    const xml = new File(['<NFSe/>'], 'nota.xml', { type: 'text/xml' });
    const pdf = new File(['%PDF'], 'danfse.pdf', { type: 'application/pdf' });
    await dfeService.retornoManual('d1', 'u1', xml, pdf);
    let { url, init } = lastCall();
    expect(url).toMatch(/\/nfe\/dfe\/documents\/d1\/retorno-manual$/);
    expect(init.method).toBe('POST');
    let form = init.body as FormData;
    expect([...form.keys()].sort()).toEqual(['file', 'pdf', 'unitId']);
    expect((form.get('file') as File).name).toBe('nota.xml');
    expect((form.get('pdf') as File).name).toBe('danfse.pdf');
    expect(form.get('unitId')).toBe('u1');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');

    await dfeService.retornoManual('d1', 'u1', xml);
    ({ init } = lastCall());
    form = init.body as FormData;
    expect([...form.keys()].sort()).toEqual(['file', 'unitId']);
  });

  it('cancelamentoManual: multipart com file, unitId, cMotivo como TEXTO e xMotivo', async () => {
    const xml = new File(['<evento/>'], 'evento.xml', { type: 'text/xml' });
    await dfeService.cancelamentoManual('d1', { unitId: 'u1', cMotivo: 2, xMotivo: 'Serviço não foi prestado ao cliente' }, xml);
    const { url, init } = lastCall();
    expect(url).toMatch(/\/nfe\/dfe\/documents\/d1\/cancelamento-manual$/);
    const form = init.body as FormData;
    expect([...form.keys()].sort()).toEqual(['cMotivo', 'file', 'unitId', 'xMotivo']);
    expect(form.get('cMotivo')).toBe('2');
    expect(typeof form.get('cMotivo')).toBe('string');
    expect(form.get('xMotivo')).toBe('Serviço não foi prestado ao cliente');
    expect((form.get('file') as File).name).toBe('evento.xml');
  });

  it('downloadDocumentAttachment: GET /accounting/attachments/:id?unitId= e baixa com o nome dado', async () => {
    const createObjectURL = vi.fn(() => 'blob:1');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await accountingService.downloadDocumentAttachment('att 1', 'u1', 'nfse-123.xml');
    const { url, init } = lastCall();
    expect(url).toMatch(/\/accounting\/attachments\/att%201\?unitId=u1$/);
    expect(init.method).toBe('GET');
    expect(click).toHaveBeenCalledTimes(1);
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('nfse-123.xml');
    click.mockRestore();
  });
});
