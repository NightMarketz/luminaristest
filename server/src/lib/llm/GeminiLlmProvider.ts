import { ApiError, GoogleGenAI } from '@google/genai';
import type { LlmCompleteInput, LlmCompleteResult, LlmProvider, LlmToolCall } from './LlmProvider';
import { LlmProviderError, kindFromHttpStatus, resolveLlmCallTimeoutMs, toArgsRecord, withDeadline } from './LlmProvider';

type GeminiPart = {
  text?: string;
  functionCall?: { id?: string; name?: string; args?: Record<string, unknown> };
  functionResponse?: { id?: string; name: string; response: Record<string, unknown> };
};
/** Resposta do `generateContent` no que o adaptador lê (a fixture grava esse formato). */
export type GeminiResponse = {
  modelVersion?: string;
  candidates?: Array<{ content?: { role?: string; parts?: GeminiPart[] } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};
export type GeminiRequest = {
  model: string;
  contents: Array<{ role: 'user' | 'model'; parts: GeminiPart[] }>;
  config: {
    maxOutputTokens: number;
    abortSignal?: AbortSignal;
    systemInstruction?: string;
    tools?: Array<{ functionDeclarations: Array<{ name: string; description: string; parametersJsonSchema: Record<string, unknown> }> }>;
  };
};
/** Fatia do cliente que o adaptador usa — o teste injeta um falso. */
export interface GeminiClientLike {
  models: { generateContent(req: GeminiRequest): Promise<GeminiResponse> };
}

const defaultClient = (apiKey: string): GeminiClientLike => new GoogleGenAI({ apiKey }) as unknown as GeminiClientLike;

/** Adaptador Gemini da porta `LlmProvider` (item 6; SDK oficial `@google/genai`, F-TM-9). */
export class GeminiLlmProvider implements LlmProvider {
  readonly id = 'gemini' as const;

  constructor(
    private readonly clientFor: (apiKey: string) => GeminiClientLike = defaultClient,
    private readonly timeoutMs: number = resolveLlmCallTimeoutMs(),
  ) {}

  async complete(input: LlmCompleteInput): Promise<LlmCompleteResult> {
    const req = toGeminiRequest(input);
    const client = this.clientFor(input.apiKey);
    let res: GeminiResponse;
    try {
      res = await withDeadline(this.id, this.timeoutMs, (signal) =>
        client.models.generateContent({ ...req, config: { ...req.config, abortSignal: signal } }),
      );
    } catch (error) {
      throw toProviderError(error);
    }
    return fromGeminiResponse(res, input.model);
  }
}

export function toGeminiRequest(input: LlmCompleteInput): GeminiRequest {
  const system: string[] = [];
  const contents: GeminiRequest['contents'] = [];
  // O Gemini responde à ferramenta pelo nome; a porta só carrega o id — o nome vem da chamada anterior.
  const nameById = new Map<string, string>();
  const push = (role: 'user' | 'model', parts: GeminiPart[]) => {
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts.push(...parts);
    else contents.push({ role, parts });
  };
  for (const m of input.messages) {
    if (m.role === 'system') system.push(m.content);
    else if (m.role === 'user') push('user', [{ text: m.content }]);
    else if (m.role === 'assistant') {
      const parts: GeminiPart[] = [];
      if (m.content) parts.push({ text: m.content });
      for (const c of m.toolCalls ?? []) {
        nameById.set(c.id, c.name);
        parts.push({ functionCall: { id: c.id, name: c.name, args: c.arguments } });
      }
      push('model', parts);
    } else if (m.role === 'tool') {
      push('user', [
        { functionResponse: { id: m.toolCallId, name: nameById.get(m.toolCallId) ?? m.toolCallId, response: { content: m.content } } },
      ]);
    }
  }
  return {
    model: input.model,
    contents,
    config: {
      maxOutputTokens: input.maxTokens,
      ...(system.length ? { systemInstruction: system.join('\n\n') } : {}),
      ...(input.tools?.length
        ? {
            tools: [
              {
                functionDeclarations: input.tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                  parametersJsonSchema: t.parameters,
                })),
              },
            ],
          }
        : {}),
    },
  };
}

export function fromGeminiResponse(res: GeminiResponse, requestedModel: string): LlmCompleteResult {
  const parts = res.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter((p) => typeof p.text === 'string').map((p) => p.text as string);
  const toolCalls: LlmToolCall[] = parts
    .filter((p) => p.functionCall)
    .map((p, i) => ({
      // A API do Gemini pode omitir o id; o da porta é posicional nesse caso.
      id: p.functionCall?.id ?? `call_${i}`,
      name: String(p.functionCall?.name),
      arguments: toArgsRecord(p.functionCall?.args),
    }));
  return {
    message: { role: 'assistant', content: text.length ? text.join('') : null, ...(toolCalls.length ? { toolCalls } : {}) },
    usage: {
      model: res.modelVersion ?? requestedModel,
      promptTokens: res.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: res.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

function toProviderError(error: unknown): LlmProviderError {
  if (error instanceof LlmProviderError) return error;
  if (error instanceof ApiError) {
    return new LlmProviderError(kindFromHttpStatus(error.status), `Gemini: ${error.message}`, 'gemini');
  }
  return new LlmProviderError('SERVER', `Gemini: ${error instanceof Error ? error.message : String(error)}`, 'gemini');
}
