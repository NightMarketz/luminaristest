import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../api-client';
import { notify } from '../../notifications/notify';

/**
 * apiClient.request — R2b (20/10): a rejeição não-2xx sempre leva `status`, corpo não-JSON não ganha `error`
 * sintético, `silent` cala o toast e `token` substitui o cookie.
 */
vi.mock('cookies-next', () => ({ getCookie: () => 'cookie-tok' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

function res(status: number, text: string): Response {
  return { ok: status < 400, status, statusText: 'Bad Gateway', text: async () => text } as unknown as Response;
}
function lastHeaders(): Record<string, string> {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  return (calls[calls.length - 1][1] as RequestInit).headers as Record<string, string>;
}

describe('apiClient.request', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    vi.mocked(notify).mockClear();
  });

  it('não-2xx com corpo vazio: rejeita com { status } (antes: "Network request failed", sem status)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(500, ''));
    await expect(apiClient.get('/x')).rejects.toEqual({ status: 500 });
  });

  it('não-2xx com corpo sem error/message: o corpo vem inteiro, com status', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(422, JSON.stringify({ details: ['a'] })));
    await expect(apiClient.post('/x', {})).rejects.toEqual({ details: ['a'], status: 422 });
  });

  it('não-2xx com corpo não-JSON: { status } sem error sintético; o toast usa "Erro <status>: <statusText>"', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(502, '<html>proxy</html>'));
    await expect(apiClient.get('/x')).rejects.toEqual({ status: 502 });
    expect(notify).toHaveBeenCalledWith('Erro 502: Bad Gateway', 'error', 'Erro');
  });

  it('2xx com corpo não-JSON: segue devolvendo { error: "Failed to parse server response" }', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(200, 'oops'));
    await expect(apiClient.get('/x')).resolves.toEqual({ error: 'Failed to parse server response' });
  });

  it('silent: rejeita igual, sem toast', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(400, JSON.stringify({ error: 'inválido' })));
    await expect(apiClient.get('/x', { silent: true })).rejects.toEqual({ error: 'inválido', status: 400 });
    expect(notify).not.toHaveBeenCalled();
    await expect(apiClient.get('/x')).rejects.toEqual({ error: 'inválido', status: 400 });
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('silent e token não vão para o fetch; token substitui o cookie no Bearer', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(200, '{}'));
    await apiClient.get('/x', { silent: true, token: 'ssr-tok' });
    const init = vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit & { silent?: unknown; token?: unknown };
    expect(init.silent).toBeUndefined();
    expect(init.token).toBeUndefined();
    expect(lastHeaders().Authorization).toBe('Bearer ssr-tok');
    await apiClient.get('/x');
    expect(lastHeaders().Authorization).toBe('Bearer cookie-tok');
    expect(lastHeaders()['x-user-timezone']).toBeTruthy();
  });

  it('falha de rede: o erro nativo passa como veio', async () => {
    const native = new TypeError('Failed to fetch');
    vi.mocked(globalThis.fetch).mockRejectedValue(native);
    await expect(apiClient.get('/x')).rejects.toBe(native);
  });
});
