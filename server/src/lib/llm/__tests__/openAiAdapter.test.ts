/**
 * BE-INCR-TEAMMATES PR-1 — item 5, adaptador OpenAI direto no SDK (dono, 2026-11-06, L-PR1-1). Sem rede: cliente falso.
 * Prova: `usage` igual ao `LlmUsage` que o `OpenAIService.reportUsage` produz; tool call → formato único; erros e prazo.
 */
import { APIError } from 'openai';
import fixture from './fixtures/openai-tool-call.json';
import { OpenAiLlmProvider, type OpenAiChatRequest, type OpenAiClientLike } from '../OpenAiLlmProvider';
import { LlmProviderError, triggersFallback, type LlmCompleteInput } from '../LlmProvider';
import type { LlmUsage } from '../../openai/llmUsage';

const input: LlmCompleteInput = {
  apiKey: 'sk-openai-tenant',
  model: 'gpt-4o',
  maxTokens: 256,
  messages: [
    { role: 'system', content: 'Você é o teammate Conciliação.' },
    { role: 'user', content: 'Concilie.' },
    { role: 'assistant', content: null, toolCalls: [{ id: 't1', name: 'listar_titulos', arguments: { status: 'OPEN' } }] },
    { role: 'tool', toolCallId: 't1', content: '[]' },
  ],
  tools: [{ name: 'listar_linhas_extrato', description: 'Linhas', parameters: { type: 'object', properties: {} } }],
};

const clientReturning = (res: unknown, seen: { key?: string; body?: OpenAiChatRequest } = {}) => (apiKey: string) => {
  seen.key = apiKey;
  return { chat: { completions: { create: async (body: OpenAiChatRequest) => ((seen.body = body), res) } } } as OpenAiClientLike;
};

describe('OpenAiLlmProvider (item 5)', () => {
  it('fixture com tool call → formato único; usage igual ao LlmUsage atual; chave do turno chega ao SDK', async () => {
    const seen: { key?: string; body?: OpenAiChatRequest } = {};
    const res = await new OpenAiLlmProvider(clientReturning(fixture, seen), 1000).complete(input);

    expect(res.message).toEqual({
      role: 'assistant',
      content: null,
      toolCalls: [{ id: 'call_Fixture01', name: 'listar_linhas_extrato', arguments: { accountId: 'acc_1', limit: 20 } }],
    });
    // Regra do OpenAIService.reportUsage: completion.model + prompt_tokens/completion_tokens.
    const atual: LlmUsage = { model: fixture.model, promptTokens: fixture.usage.prompt_tokens, completionTokens: fixture.usage.completion_tokens };
    expect(res.usage).toEqual(atual);
    expect(seen.key).toBe('sk-openai-tenant');
    expect(seen.body?.messages[2]).toEqual({
      role: 'assistant',
      content: null,
      tool_calls: [{ id: 't1', type: 'function', function: { name: 'listar_titulos', arguments: '{"status":"OPEN"}' } }],
    });
    expect(seen.body?.messages[3]).toEqual({ role: 'tool', tool_call_id: 't1', content: '[]' });
    expect(seen.body?.max_tokens).toBe(256);
  });

  it('usage ausente → 0/0 (mesma regra do OpenAIService)', async () => {
    const res = await new OpenAiLlmProvider(clientReturning({ ...fixture, usage: null }), 1000).complete(input);
    expect(res.usage).toEqual({ model: fixture.model, promptTokens: 0, completionTokens: 0 });
  });

  it.each([
    [429, 'rate_limit_exceeded', 'RATE_LIMIT'],
    [429, 'insufficient_quota', 'QUOTA'],
    [500, null, 'SERVER'],
    [503, null, 'SERVER'],
    [401, 'invalid_api_key', 'AUTH'],
    [400, 'context_length_exceeded', 'BAD_REQUEST'],
  ] as const)('APIError %s/%s → %s', async (status, code, kind) => {
    const err = new APIError(status, { code, message: 'falhou' }, 'falhou', new Headers());
    const provider = new OpenAiLlmProvider(() => ({ chat: { completions: { create: async () => { throw err; } } } }), 1000);
    await expect(provider.complete(input)).rejects.toMatchObject({ kind, provider: 'openai' });
  });

  it('F-TM-E1: cliente que não responde → TIMEOUT no prazo, sinal abortado, transitório', async () => {
    let signal: AbortSignal | undefined;
    const provider = new OpenAiLlmProvider(
      () => ({ chat: { completions: { create: (_b, o) => ((signal = o.signal), new Promise(() => undefined)) } } }),
      30,
    );
    const err = await provider.complete(input).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LlmProviderError);
    expect((err as LlmProviderError).kind).toBe('TIMEOUT');
    expect(signal?.aborted).toBe(true);
    expect(triggersFallback(err)).toBe(true);
  });
});
