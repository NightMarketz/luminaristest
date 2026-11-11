import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../api-client';

/**
 * F1-N3 (toast duplo): quem captura um erro do apiClient não sabe se o toast já saiu, e repete o aviso
 * (o seed do painel) ou deixa de avisar (useConfirmModal). O erro passa a dizer se foi notificado:
 * `notified` (não enumerável) é true quando o apiClient mostrou o toast e false com `silent`.
 */
vi.mock('cookies-next', () => ({ getCookie: () => undefined }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

const notifiedOf = (e: unknown) => (e as { notified?: unknown }).notified;

describe('F1-N3 — erro do apiClient diz se o toast já saiu', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('erro HTTP notificado vem com notified=true, e com silent vem false', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response(JSON.stringify({ error: 'falhou' }), { status: 500 }));
    expect(notifiedOf(await apiClient.get('/x').catch((e: unknown) => e))).toBe(true);
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response(JSON.stringify({ error: 'falhou' }), { status: 500 }));
    expect(notifiedOf(await apiClient.get('/x', { silent: true }).catch((e: unknown) => e))).toBe(false);
  });

  it('falha de rede e resposta 2xx ilegível também dizem notified=true', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    expect(notifiedOf(await apiClient.get('/x').catch((e: unknown) => e))).toBe(true);
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response('<html>', { status: 200 }));
    expect(notifiedOf(await apiClient.get('/x').catch((e: unknown) => e))).toBe(true);
  });

  it('notified não aparece no spread do erro (o corpo continua igual)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response(JSON.stringify({ error: 'falhou' }), { status: 400 }));
    const err = await apiClient.get('/x').catch((e: unknown) => e);
    expect({ ...(err as object) }).toEqual({ error: 'falhou', status: 400 });
  });
});
