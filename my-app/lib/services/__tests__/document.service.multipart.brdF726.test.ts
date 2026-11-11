import { DocumentService } from '../document.service';

/**
 * BRD F-72.6 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-72). `document.service.ts` montava o upload à mão:
 * `${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/upload` (sem a variável, `undefined/documents/upload`) e o
 * token por `document.cookie.split('auth_token=')` (pega o valor de `x_auth_token` se esse cookie vier antes).
 * Comportamento esperado: o mesmo caminho dos outros uploads (`lib/services/multipart.ts`) — URL base com default e
 * cookie lido pelo nome exato.
 */
function lastCall() {
  const [url, init] = vi.mocked(globalThis.fetch).mock.calls.at(-1)!;
  return { url: String(url), headers: (init as RequestInit).headers as Record<string, string> };
}

describe('BRD F-72.6 — upload de documento pelo multipart.ts', () => {
  const anterior = process.env.NEXT_PUBLIC_API_BASE_URL;
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    document.cookie = 'x_auth_token=outro; path=/';
    document.cookie = 'auth_token=tok-certo; path=/';
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, data: {} }) } as unknown as Response);
  });
  afterEach(() => {
    if (anterior === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = anterior;
    document.cookie = 'x_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it.each([
    ['uploadDocument', '/documents/upload'],
    ['getTokenCost', '/documents/token-cost'],
  ] as const)('BRD F-72.6 %s: URL com base default e token do cookie auth_token exato', async (method, path) => {
    await DocumentService[method](new FormData());
    const { url, headers } = lastCall();
    expect(url).toBe(`http://localhost:3001/api${path}`);
    expect(headers.Authorization).toBe('Bearer tok-certo');
  });
});
