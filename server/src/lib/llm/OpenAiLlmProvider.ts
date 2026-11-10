import OpenAI, { APIError } from 'openai';
import type { LlmCompleteInput, LlmCompleteResult, LlmProvider, LlmToolCall } from './LlmProvider';
import { LlmProviderError, kindFromHttpStatus, resolveLlmCallTimeoutMs, toArgsRecord, withDeadline } from './LlmProvider';

/** Resposta do Chat Completions no que o adaptador lê (o SDK devolve isso; a fixture grava isso). */
export type OpenAiChatResponse = {
  model: string;
  choices: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{ id: string; type?: string; function?: { name: string; arguments: string } }> | null;
    };
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number } | null;
};
type OpenAiMessage =
  | { role: 'system' | 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
    }
  | { role: 'tool'; tool_call_id: string; content: string };
export type OpenAiChatRequest = {
  model: string;
  max_tokens: number;
  messages: OpenAiMessage[];
  tools?: Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }>;
};
/** Fatia do cliente que o adaptador usa — o teste injeta um falso. */
export interface OpenAiClientLike {
  chat: { completions: { create(body: OpenAiChatRequest, options: { signal: AbortSignal }): Promise<OpenAiChatResponse> } };
}

const defaultClient = (apiKey: string): OpenAiClientLike => new OpenAI({ apiKey }) as unknown as OpenAiClientLike;

/**
 * Adaptador OpenAI da porta `LlmProvider` (item 5). Decisão do dono (chat, 2026-11-06, L-PR1-1): direto no SDK `openai`,
 * com a chave do turno (BYOK); o `OpenAIService` (entrevista, extração) fica intocado. `usage` segue a mesma regra do
 * `OpenAIService.reportUsage`: `completion.model`, `prompt_tokens`, `completion_tokens`, ausente → 0.
 */
export class OpenAiLlmProvider implements LlmProvider {
  readonly id = 'openai' as const;

  constructor(
    private readonly clientFor: (apiKey: string) => OpenAiClientLike = defaultClient,
    private readonly timeoutMs: number = resolveLlmCallTimeoutMs(),
  ) {}

  async complete(input: LlmCompleteInput): Promise<LlmCompleteResult> {
    const body = toOpenAiRequest(input);
    const client = this.clientFor(input.apiKey);
    let res: OpenAiChatResponse;
    try {
      res = await withDeadline(this.id, this.timeoutMs, (signal) => client.chat.completions.create(body, { signal }));
    } catch (error) {
      throw toProviderError(error);
    }
    return fromOpenAiResponse(res);
  }
}

export function toOpenAiRequest(input: LlmCompleteInput): OpenAiChatRequest {
  const messages: OpenAiMessage[] = input.messages.map((m) => {
    if (m.role === 'tool') return { role: 'tool', tool_call_id: m.toolCallId, content: m.content };
    if (m.role === 'assistant') {
      return {
        role: 'assistant',
        content: m.content,
        ...(m.toolCalls?.length
          ? {
              tool_calls: m.toolCalls.map((c) => ({
                id: c.id,
                type: 'function' as const,
                function: { name: c.name, arguments: JSON.stringify(c.arguments) },
              })),
            }
          : {}),
      };
    }
    return { role: m.role, content: m.content };
  });
  return {
    model: input.model,
    max_tokens: input.maxTokens,
    messages,
    ...(input.tools?.length
      ? { tools: input.tools.map((t) => ({ type: 'function' as const, function: { name: t.name, description: t.description, parameters: t.parameters } })) }
      : {}),
  };
}

function parseArgs(raw: string | undefined): Record<string, unknown> {
  try {
    return toArgsRecord(JSON.parse(raw ?? '{}'));
  } catch {
    // Argumento que não é JSON: vira `{}` (o modelo recebe o erro da ferramenta, como no toArgsRecord).
    return {};
  }
}

export function fromOpenAiResponse(res: OpenAiChatResponse): LlmCompleteResult {
  const msg = res.choices[0]?.message;
  const toolCalls: LlmToolCall[] = (msg?.tool_calls ?? [])
    .filter((c) => c.function)
    .map((c) => ({ id: c.id, name: String(c.function?.name), arguments: parseArgs(c.function?.arguments) }));
  return {
    message: { role: 'assistant', content: msg?.content ?? null, ...(toolCalls.length ? { toolCalls } : {}) },
    usage: {
      model: res.model,
      promptTokens: res.usage?.prompt_tokens ?? 0,
      completionTokens: res.usage?.completion_tokens ?? 0,
    },
  };
}

export function toProviderError(error: unknown): LlmProviderError {
  if (error instanceof LlmProviderError) return error;
  if (error instanceof APIError) {
    // `insufficient_quota` (429 da OpenAI quando o crédito acabou) → QUOTA.
    const kind = kindFromHttpStatus(error.status, error.code === 'insufficient_quota');
    return new LlmProviderError(kind, `OpenAI: ${error.message}`, 'openai');
  }
  return new LlmProviderError('SERVER', `OpenAI: ${error instanceof Error ? error.message : String(error)}`, 'openai');
}
