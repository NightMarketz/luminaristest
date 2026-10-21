// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { apiClient } from '../api-client';
import { DynamicTableService } from '../../services/dynamic-table.service';

/**
 * apiClient no servidor (getServerSideProps): sem `window`, o cookie não é lido — vale o `token` explícito — e não vai
 * `x-user-timezone` (o fuso do Node não é o do usuário). `DynamicTableService.getTablesSsr` repassa o Cookie.
 */
vi.mock('cookies-next', () => ({ getCookie: () => undefined }));

describe('apiClient em SSR', () => {
  it('Bearer do token explícito, Cookie repassado, sem x-user-timezone', async () => {
    expect(typeof window).toBe('undefined');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify({ success: true, data: [{ id: 't1' }] }),
    } as unknown as Response);

    await expect(DynamicTableService.getTablesSsr({ token: 'tok', cookie: 'auth_token=tok; a=b' }))
      .resolves.toEqual({ success: true, data: [{ id: 't1' }] });

    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/dynamic-tables$/);
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok');
    expect(headers.Cookie).toBe('auth_token=tok; a=b');
    expect(headers['x-user-timezone']).toBeUndefined();
  });

  it('401 rejeita com o status (a página apaga o cookie e redireciona)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 401, statusText: 'Unauthorized', text: async () => '',
    } as unknown as Response);
    await expect(apiClient.get('/dynamic-tables', { token: 'tok', silent: true })).rejects.toMatchObject({ status: 401 });
  });
});
