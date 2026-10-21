import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../api-client';

/**
 * Teste-guarda — ACHADOS-2026-10-19 §3.5 item 5 (FIX-FE-DASHBOARD).
 *
 * `request` lança `{ ...result, status }` (objeto plano). Todo consumidor que faz `err instanceof Error ? err.message
 * : fallback` cai no fallback, e o erro por campo do servidor nunca chega à tela (ex.: wizard de pessoas).
 * Comportamento correto esperado: a rejeição de não-2xx é `instanceof Error`, com a mensagem do servidor em
 * `message` e o `status` preservado.
 */
vi.mock('cookies-next', () => ({ getCookie: () => undefined }));
vi.mock('../../notifications/notify', () => ({ notify: vi.fn() }));

describe('apiClient — rejeição é Error', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 400, statusText: 'Bad Request',
      text: async () => JSON.stringify({ success: false, error: 'CPF inválido' }),
    } as unknown as Response);
  });

  it('400 com { error } rejeita com instanceof Error, message do servidor e status', async () => {
    const err = await apiClient.post('/x', {}).catch((e: unknown) => e);
    expect((err as { status?: number }).status).toBe(400);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('CPF inválido');
  });
});
