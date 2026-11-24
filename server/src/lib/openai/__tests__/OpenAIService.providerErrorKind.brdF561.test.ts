/**
 * BRD F-56.1 (GAP-MAP, faixa 1 de 2026-11-10; fichas BRD-56 e BRD-60 do inventário de estruturas implícitas).
 *
 * Falha do provedor no `OpenAIService` (chat ERP, chat RAG) virava `new Error('Failed to get response from AI
 * service…')`, e o `handleApiError` respondia 500 `INTERNAL_SERVER_ERROR`: o usuário lia "erro interno" para um
 * limite de taxa. Os teammates já têm o tipo por categoria (`LlmProviderError`, `lib/llm/LlmProvider.ts`).
 * Comportamento esperado: o serviço lança `LlmProviderError` com a categoria, e a resposta HTTP traz o código
 * da categoria (`LLM_RATE_LIMIT`), não o 500 genérico.
 */
import type { Response } from 'express';
import { APIError } from 'openai';
import { OpenAIService } from '../OpenAIService';
import { handleApiError } from '../../apiUtils';
import { LlmProviderError } from '../../llm/LlmProvider';

function serviceRejecting(error: unknown): OpenAIService {
  const anterior = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = anterior ?? 'teste';
  const service = new OpenAIService();
  process.env.OPENAI_API_KEY = anterior;
  const create = jest.fn(async () => {
    throw error;
  });
  Object.assign(service as unknown as { openai: unknown }, { openai: { chat: { completions: { create } } } });
  return service;
}

function mockRes(): Response {
  const res = {} as Response;
  res.status = jest.fn(() => res) as unknown as Response['status'];
  res.json = jest.fn(() => res) as unknown as Response['json'];
  return res;
}

describe('BRD F-56.1 — falha do provedor no chat sai com a categoria', () => {
  const rateLimit = new APIError(429, { code: 'rate_limit_exceeded', message: 'slow down' }, 'slow down', new Headers());

  it('BRD F-56.1 getChatCompletionWithToolsAndHistory: 429 ⇒ LlmProviderError RATE_LIMIT ⇒ HTTP sem 500 genérico', async () => {
    const err = await serviceRejecting(rateLimit)
      .getChatCompletionWithToolsAndHistory([{ role: 'user', content: 'oi' }], [])
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LlmProviderError);
    expect((err as LlmProviderError).kind).toBe('RATE_LIMIT');

    const res = mockRes();
    handleApiError(err, res);
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'LLM_RATE_LIMIT' }));
  });

  it('BRD F-56.1 getChatCompletionWithHistory: crédito esgotado ⇒ QUOTA', async () => {
    const quota = new APIError(429, { code: 'insufficient_quota', message: 'quota' }, 'quota', new Headers());
    const err = await serviceRejecting(quota)
      .getChatCompletionWithHistory([{ role: 'user', content: 'oi' }])
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LlmProviderError);
    expect((err as LlmProviderError).kind).toBe('QUOTA');
  });

  it('BRD F-56.1 o texto do provedor não chega ao cliente', async () => {
    const err = await serviceRejecting(rateLimit)
      .getChatCompletionWithHistory([{ role: 'user', content: 'oi' }])
      .catch((e: unknown) => e);
    const res = mockRes();
    handleApiError(err, res);
    expect(JSON.stringify((res.json as jest.Mock).mock.calls[0][0])).not.toContain('slow down');
  });
});
