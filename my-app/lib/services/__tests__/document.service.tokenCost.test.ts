/**
 * FIX-CHAT-AGENTE lote B, §3.3 #15 do ACHADOS-2026-10-19 — o servidor responde `{ success, data: { tokens } }` e
 * `getTokenCost` devolvia o envelope cru; `create.tsx` lê `data.tokens` → a estimativa nunca aparece.
 * Autorização: dono, chat, 2026-10-21 e 2026-10-22 ("Todos os 22 em série").
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { DocumentService } from '../document.service';

afterEach(() => vi.unstubAllGlobals());

describe('DocumentService.getTokenCost', () => {
  it('desembrulha o envelope { success, data }: tokens fica no nível de cima', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { tokens: 42, charCount: 168 } }),
    }));

    const result = await DocumentService.getTokenCost(new FormData());

    expect(result.tokens).toBe(42);
  });
});
