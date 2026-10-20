import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../ApiClient';
import { notify } from '@/lib/notifications/notify';

/** Cliente do seed sobre DynamicTableService (R2b): mesmas rotas e corpo `{ data }`, sem toast, dump de erro com status. */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));

function res(status: number, body: unknown): Response {
  return { ok: status < 400, status, statusText: 'X', text: async () => JSON.stringify(body) } as unknown as Response;
}
function lastCall(): { url: string; init: RequestInit } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, init };
}

describe('seed ApiClient', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    vi.mocked(notify).mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('getRows: GET /dynamic-tables/:id/data → data; não-2xx → [] (como antes, sem checar ok)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(200, { data: [{ id: 'r1' }] }));
    await expect(new ApiClient().getRows('t1')).resolves.toEqual([{ id: 'r1' }]);
    expect(lastCall().url).toMatch(/\/dynamic-tables\/t1\/data$/);
    vi.mocked(globalThis.fetch).mockResolvedValue(res(404, { error: 'nf' }));
    await expect(new ApiClient().getRows('t1')).resolves.toEqual([]);
    expect(notify).not.toHaveBeenCalled();
  });

  it('postRow: POST { data } e devolve o id; sem toast de sucesso', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(201, { data: { id: 'n1' } }));
    await expect(new ApiClient().postRow('t1', { nome: 'A' })).resolves.toBe('n1');
    const { url, init } = lastCall();
    expect(url).toMatch(/\/dynamic-tables\/t1\/data$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ data: { nome: 'A' } });
    expect(notify).not.toHaveBeenCalled();
  });

  it('postRow/putRow com erro: dump com status e corpo, mensagem com details; sem toast', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(400, { details: { nome: 'obrigatório' } }));
    await expect(new ApiClient().postRow('t1', {}, 'Clientes')).rejects.toThrow(/\[Clientes\] Falha ao criar: [\s\S]*obrigatório/);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('(Status: 400)'));
    vi.mocked(globalThis.fetch).mockResolvedValue(res(500, {}));
    await expect(new ApiClient().putRow('t1', 'r1', {}, 'Clientes')).rejects.toThrow('[Clientes] Falha ao atualizar: {}');
    expect(lastCall().init.method).toBe('PUT');
    expect(notify).not.toHaveBeenCalled();
  });
});
