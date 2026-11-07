import Anthropic, { APIError } from '@anthropic-ai/sdk';
import type {
  LlmCompleteInput,
  LlmCompleteResult,
  LlmProvider,
  LlmToolCall,
} from './LlmProvider';
import { LlmProviderError, kindFromHttpStatus, resolveLlmCallTimeoutMs, toArgsRecord, withDeadline } from './LlmProvider';

/** Resposta da Messages API no que o adaptador lê (o SDK devolve isso; a fixture grava isso). */
export type AnthropicMessageResponse = {
  model: string;
  content: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }>;
  usage?: { input_tokens?: number | null; output_tokens?: number | null } | null;
};
type AnthropicBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };
export type AnthropicRequest = {
  model: string;
  max_tokens: number;
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: AnthropicBlock[] }>;
  tools?: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>;
};
/** Fatia do cliente que o adaptador usa — o teste injeta um falso. */
export interface AnthropicClientLike {
  messages: { create(body: AnthropicRequest, options: { signal: AbortSignal }): Promise<AnthropicMessageResponse> };
}

const defaultClient = (apiKey: string): AnthropicClientLike =>
  new Anthropic({ apiKey }) as unknown as AnthropicClientLike;

/** Adaptador Anthropic da porta `LlmProvider` (item 6; SDK oficial `@anthropic-ai/sdk`, F-TM-9). */
export class AnthropicLlmProvider implements LlmProvider {
  readonly id = 'anthropic' as const;

  constructor(
    private readonly clientFor: (apiKey: string) => AnthropicClientLike = defaultClient,
    private readonly timeoutMs: number = resolveLlmCallTimeoutMs(),
  ) {}

  async complete(input: LlmCompleteInput): Promise<LlmCompleteResult> {
    const body = toAnthropicRequest(input);
    const client = this.clientFor(input.apiKey);
    let res: AnthropicMessageResponse;
    try {
      res = await withDeadline(this.id, this.timeoutMs, (signal) => client.messages.create(body, { signal }));
    } catch (error) {
      throw toProviderError(error);
    }
    return fromAnthropicResponse(res);
  }
}

export function toAnthropicRequest(input: LlmCompleteInput): AnthropicRequest {
  const system = input.messages.filter((m) => m.role === 'system').map((m) => (m as { content: string }).content);
  const messages: AnthropicRequest['messages'] = [];
  const push = (role: 'user' | 'assistant', blocks: AnthropicBlock[]) => {
    const last = messages[messages.length - 1];
    // A API exige alternância user/assistant: resultados de ferramenta seguidos entram na mesma mensagem user.
    if (last && last.role === role) last.content.push(...blocks);
    else messages.push({ role, content: blocks });
  };
  for (const m of input.messages) {
    if (m.role === 'system') continue;
    if (m.role === 'user') push('user', [{ type: 'text', text: m.content }]);
    else if (m.role === 'tool') push('user', [{ type: 'tool_result', tool_use_id: m.toolCallId, content: m.content }]);
    else if (m.role === 'assistant') {
      const blocks: AnthropicBlock[] = [];
      if (m.content) blocks.push({ type: 'text', text: m.content });
      for (const c of m.toolCalls ?? []) blocks.push({ type: 'tool_use', id: c.id, name: c.name, input: c.arguments });
      push('assistant', blocks);
    }
  }
  return {
    model: input.model,
    max_tokens: input.maxTokens,
    ...(system.length ? { system: system.join('\n\n') } : {}),
    messages,
    ...(input.tools?.length
      ? { tools: input.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })) }
      : {}),
  };
}

export function fromAnthropicResponse(res: AnthropicMessageResponse): LlmCompleteResult {
  const text = res.content.filter((b) => b.type === 'text' && typeof b.text === 'string').map((b) => b.text as string);
  const toolCalls: LlmToolCall[] = res.content
    .filter((b) => b.type === 'tool_use')
    .map((b) => ({ id: String(b.id), name: String(b.name), arguments: toArgsRecord(b.input) }));
  return {
    message: {
      role: 'assistant',
      content: text.length ? text.join('') : null,
      ...(toolCalls.length ? { toolCalls } : {}),
    },
    usage: {
      model: res.model,
      promptTokens: res.usage?.input_tokens ?? 0,
      completionTokens: res.usage?.output_tokens ?? 0,
    },
  };
}

function toProviderError(error: unknown): LlmProviderError {
  if (error instanceof LlmProviderError) return error;
  if (error instanceof APIError) {
    // `billing_error` = crédito da conta acabou → QUOTA (dispara a reserva, item 9).
    const kind = kindFromHttpStatus(error.status, error.type === 'billing_error');
    return new LlmProviderError(kind, `Anthropic: ${error.message}`, 'anthropic');
  }
  return new LlmProviderError('SERVER', `Anthropic: ${error instanceof Error ? error.message : String(error)}`, 'anthropic');
}
