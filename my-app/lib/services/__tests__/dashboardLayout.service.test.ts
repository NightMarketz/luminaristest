import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardLayoutService } from '../dashboardLayout.service';

/** dashboardLayout.service — R2b: mesma URL/método/corpo/headers do antigo dashboard-layout.api.ts; erro vira Error. */
vi.mock('cookies-next', () => ({ getCookie: () => 'tok-1' }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

function res(status: number, body: unknown): Response {
  return { ok: status < 400, status, statusText: 'X', text: async () => JSON.stringify(body) } as unknown as Response;
}
function lastCall(): { url: string; init: RequestInit } {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, init };
}
const cfg = { positions: [], columns: 12, widgets: [] };

describe('DashboardLayoutService', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('list: GET /dashboard-layout com Bearer do cookie; devolve o data', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(200, { success: true, data: [{ id: 'l1' }] }));
    await expect(DashboardLayoutService.list()).resolves.toEqual([{ id: 'l1' }]);
    const { url, init } = lastCall();
    expect(url).toMatch(/\/dashboard-layout$/);
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
  });

  it.each([
    ['create', () => DashboardLayoutService.create('D', cfg), 'POST', /\/dashboard-layout$/, { name: 'D', type: 'GRID', config: cfg }],
    ['saveConfig', () => DashboardLayoutService.saveConfig('l1', cfg), 'PATCH', /\/dashboard-layout\/l1$/, { config: cfg }],
    ['rename', () => DashboardLayoutService.rename('l1', 'N'), 'PATCH', /\/dashboard-layout\/l1$/, { name: 'N' }],
    ['activate', () => DashboardLayoutService.activate('l1'), 'POST', /\/dashboard-layout\/l1\/activate$/, {}],
  ])('%s: método, URL e corpo', async (_n, run, method, urlRe, body) => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(200, { success: true, data: { id: 'l1' } }));
    await expect(run()).resolves.toEqual({ id: 'l1' });
    const { url, init } = lastCall();
    expect(init.method).toBe(method);
    expect(url).toMatch(urlRe);
    expect(JSON.parse(String(init.body))).toEqual(body);
  });

  it('remove: DELETE /dashboard-layout/:id', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(200, { success: true }));
    await expect(DashboardLayoutService.remove('l1')).resolves.toBeUndefined();
    const { url, init } = lastCall();
    expect(init.method).toBe('DELETE');
    expect(url).toMatch(/\/dashboard-layout\/l1$/);
  });

  it('erro HTTP vira Error com a message do servidor, ou o fallback com status', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(res(403, { message: 'Proibido' }));
    await expect(DashboardLayoutService.list()).rejects.toEqual(new Error('Proibido'));
    // Corpo sem `error`/`message`: o apiClient perde o status (vira "Network request failed") — divergência
    // registrada no PR. O caso abaixo (`{ success:false, error }`) é o formato de erro usual do backend.
    vi.mocked(globalThis.fetch).mockResolvedValue(res(500, { success: false, error: 'boom' }));
    await expect(DashboardLayoutService.list()).rejects.toEqual(new Error('Dashboard layout request failed (status 500)'));
    await expect(DashboardLayoutService.remove('l1')).rejects.toEqual(new Error('Failed to delete layout (status 500)'));
  });

  it('falha de rede vira Error com a mensagem nativa', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(DashboardLayoutService.list()).rejects.toEqual(new Error('Failed to fetch'));
  });
});
