/**
 * BE-INCR-TEAMMATES PR-1 — item 6 (adaptadores Anthropic e Gemini, resposta gravada → formato único da §2.3) e
 * F-TM-E1 (prazo por chamada; estouro = `LlmProviderError('TIMEOUT')`, transitório). Sem rede: o cliente do SDK é falso
 * e devolve a fixture. As fixtures seguem o formato documentado das APIs; a resposta real de cada provedor entra ao lado
 * delas na fumaça do runbook M2 (régua A5).
 */
import { APIError } from '@anthropic-ai/sdk';
import { ApiError } from '@google/genai';
import anthropicFixture from './fixtures/anthropic-tool-call.json';
import geminiFixture from './fixtures/gemini-tool-call.json';
import { AnthropicLlmProvider, type AnthropicClientLike, type AnthropicRequest } from '../AnthropicLlmProvider';
import { GeminiLlmProvider, type GeminiClientLike, type GeminiRequest } from '../GeminiLlmProvider';
import {
  LLM_CALL_TIMEOUT_DEFAULT_MS,
  LlmProviderError,
  resolveLlmCallTimeoutMs,
  triggersFallback,
  type LlmCompleteInput,
} from '../LlmProvider';

const input: LlmCompleteInput = {
  apiKey: 'sk-tenant-key-123',
  model: 'modelo-x',
  maxTokens: 512,
  messages: [
    { role: 'system', content: 'Você é o teammate Conciliação.' },
    { role: 'user', content: 'Concilie o extrato.' },
    { role: 'assistant', content: null, toolCalls: [{ id: 't1', name: 'listar_titulos', arguments: { status: 'OPEN' } }] },
    { role: 'tool', toolCallId: 't1', content: '[]' },
  ],
  tools: [{ name: 'listar_linhas_extrato', description: 'Linhas não conciliadas', parameters: { type: 'object', properties: {} } }],
};

describe('AnthropicLlmProvider (item 6)', () => {
  it('fixture com tool_use → toolCalls no formato único e usage com tokens > 0', async () => {
    const seen: { key?: string; body?: AnthropicRequest } = {};
    const provider = new AnthropicLlmProvider((apiKey) => {
      seen.key = apiKey;
      return { messages: { create: async (body) => ((seen.body = body), anthropicFixture) } } as AnthropicClientLike;
    }, 1000);

    const res = await provider.complete(input);

    expect(res.message).toEqual({
      role: 'assistant',
      content: 'Vou buscar as linhas de extrato pendentes.',
      toolCalls: [{ id: 'toolu_01Fixture', name: 'listar_linhas_extrato', arguments: { accountId: 'acc_1', limit: 20 } }],
    });
    expect(res.usage).toEqual({ model: 'claude-sonnet-4-5', promptTokens: 412, completionTokens: 57 });
    // A chave da chamada (BYOK) é a que chega ao SDK; o system sai das mensagens; tool_result vai como user.
    expect(seen.key).toBe('sk-tenant-key-123');
    expect(seen.body?.system).toBe('Você é o teammate Conciliação.');
    expect(seen.body?.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(seen.body?.messages[2].content[0]).toEqual({ type: 'tool_result', tool_use_id: 't1', content: '[]' });
    expect(seen.body?.tools?.[0].input_schema).toEqual({ type: 'object', properties: {} });
  });

  it.each([
    [429, 'rate_limit_error', 'RATE_LIMIT'],
    [529, 'overloaded_error', 'SERVER'],
    [400, 'billing_error', 'QUOTA'],
    [401, 'authentication_error', 'AUTH'],
    [400, 'invalid_request_error', 'BAD_REQUEST'],
  ] as const)('erro %s/%s do SDK → LlmProviderError %s', async (status, type, kind) => {
    const err = new APIError(status, { type: 'error', error: { type } }, 'falhou', new Headers(), type);
    const provider = new AnthropicLlmProvider(() => ({ messages: { create: async () => { throw err; } } }), 1000);
    await expect(provider.complete(input)).rejects.toMatchObject({ kind, provider: 'anthropic' });
  });
});

describe('GeminiLlmProvider (item 6)', () => {
  it('fixture com functionCall → toolCalls no formato único e usage com tokens > 0', async () => {
    const seen: { key?: string; req?: GeminiRequest } = {};
    const provider = new GeminiLlmProvider((apiKey) => {
      seen.key = apiKey;
      return { models: { generateContent: async (req) => ((seen.req = req), geminiFixture) } } as GeminiClientLike;
    }, 1000);

    const res = await provider.complete(input);

    expect(res.message).toEqual({
      role: 'assistant',
      content: 'Vou buscar as linhas de extrato pendentes.',
      toolCalls: [{ id: 'fc_01Fixture', name: 'listar_linhas_extrato', arguments: { accountId: 'acc_1', limit: 20 } }],
    });
    expect(res.usage).toEqual({ model: 'gemini-2.5-flash', promptTokens: 388, completionTokens: 41 });
    expect(seen.key).toBe('sk-tenant-key-123');
    expect(seen.req?.config.systemInstruction).toBe('Você é o teammate Conciliação.');
    // A resposta de ferramenta leva o NOME da chamada anterior (o Gemini casa por nome).
    expect(seen.req?.contents[2].parts[0].functionResponse).toEqual({ id: 't1', name: 'listar_titulos', response: { content: '[]' } });
    expect(seen.req?.config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    [429, 'RATE_LIMIT'],
    [503, 'SERVER'],
    [403, 'AUTH'],
    [400, 'BAD_REQUEST'],
  ] as const)('ApiError %s → %s', async (status, kind) => {
    const err = new ApiError({ status, message: 'falhou' });
    const provider = new GeminiLlmProvider(() => ({ models: { generateContent: async () => { throw err; } } }), 1000);
    await expect(provider.complete(input)).rejects.toMatchObject({ kind, provider: 'gemini' });
  });
});

describe('prazo por chamada (F-TM-E1)', () => {
  it('provedor que não responde → TIMEOUT no prazo configurado, sinal abortado, e conta como transitório', async () => {
    let signal: AbortSignal | undefined;
    const provider = new AnthropicLlmProvider(
      () => ({ messages: { create: (_b, opts) => ((signal = opts.signal), new Promise(() => undefined)) } }),
      30,
    );
    const started = Date.now();
    const err = await provider.complete(input).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LlmProviderError);
    expect((err as LlmProviderError).kind).toBe('TIMEOUT');
    expect((err as LlmProviderError).message).toContain('Anthropic');
    expect(Date.now() - started).toBeLessThan(1000);
    expect(signal?.aborted).toBe(true);
    expect(triggersFallback(err)).toBe(true);
  });

  it('padrão 180 s; LLM_CALL_TIMEOUT_MS sobrepõe; valor inválido falha alto', () => {
    expect(LLM_CALL_TIMEOUT_DEFAULT_MS).toBe(180_000);
    expect(resolveLlmCallTimeoutMs({})).toBe(180_000);
    expect(resolveLlmCallTimeoutMs({ LLM_CALL_TIMEOUT_MS: '5000' })).toBe(5000);
    expect(() => resolveLlmCallTimeoutMs({ LLM_CALL_TIMEOUT_MS: 'abc' })).toThrow(/LLM_CALL_TIMEOUT_MS/);
  });
});
