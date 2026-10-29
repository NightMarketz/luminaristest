import OpenAI from 'openai';
import { createHash } from 'crypto';
import { logger } from '../logger';
import type { LlmUsage } from './llmUsage';

// Named constants for per-call output token ceilings (R11 cost guardrails)
export const MAX_TOKENS_CHAT = 1024;        // RAG chat calls (gpt-4o-mini)
export const MAX_TOKENS_AGENT = 2048;       // Agent / tool calls (gpt-4o)

// Global configuration for token limits and models
const CONFIG = {
  // Maximum tokens to process in a single request (system-wide limit)
  MAX_TOKENS_PER_REQUEST: 100000,

  // Maximum characters per chunk to stay within token limits
  // Approximately 1 token = 4 characters in English
  MAX_CHARS_PER_CHUNK: 3000,

  // Model selection. A OpenAI desativou a família gpt-3.5 (404 model_not_found em 2026-10-24): CHAT e DEFAULT
  // passaram a 'gpt-4o-mini' (decisão do dono).
  MODELS: {
    // Default model for structured data extraction
    DEFAULT: 'gpt-4o-mini',

    // Second attempt when DEFAULT fails; also structured outputs (classifyIntoEnum*, completeWithJsonSchema)
    FALLBACK: 'gpt-4o-mini',

    // Model for chat completions (RAG chat, interview, customization, tabular check)
    CHAT: 'gpt-4o-mini',

    // Model for tool usage (requires tool capabilities)
    TOOLS: 'gpt-4o'
  },

  // Output token limit per API call
  MAX_OUTPUT_TOKENS: 4096,

  // Flag to enable fallback to more powerful model
  ENABLE_FALLBACK: true
};

// Coalesces concurrent identical requests: a second call with the same key reuses the in-flight promise.
class RequestLock {
  private static locks = new Map<string, Promise<unknown>>();

  static async acquire<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.locks.has(key)) {
      logger.debug('[RequestLock] reusing in-flight request', { key });
      return this.locks.get(key) as Promise<T>;
    }

    logger.debug('[RequestLock] new request', { key });
    const promise = fn().finally(() => {
      logger.debug('[RequestLock] released', { key });
      this.locks.delete(key);
    });

    this.locks.set(key, promise);
    return promise;
  }
}

/**
 * Best-effort repair of malformed JSON returned by an LLM (trailing commas, unquoted keys, smart
 * quotes). Returns the valid/repaired string, or null if it cannot be parsed. Pure — exported for tests.
 */
/**
 * Classificação presa a um conjunto fechado (BE-INCR-KIT-SETOR-EMENDA-1 PR-K3, item 7c; L1 do dono, 13/10): structured
 * outputs `json_schema` strict, com `key` = uma das opções ou `null` — a API não pode devolver valor fora da lista.
 */
export function buildEnumResponseFormat(options: readonly string[]) {
  return {
    type: 'json_schema' as const,
    json_schema: {
      name: 'classificacao',
      strict: true,
      schema: {
        type: 'object',
        properties: { key: { anyOf: [{ type: 'string', enum: [...options] }, { type: 'null' }] } },
        required: ['key'],
        additionalProperties: false,
      },
    },
  };
}

/** Lê a escolha da resposta; JSON inválido, `null` ou valor fora de `options` ⇒ `null` (defesa além do schema). */
export function parseEnumChoice(content: string | null | undefined, options: readonly string[]): string | null {
  if (!content) return null;
  try {
    const key = (JSON.parse(content) as { key?: unknown }).key;
    return typeof key === 'string' && options.includes(key) ? key : null;
  } catch {
    return null;
  }
}

/**
 * Escolha MÚLTIPLA presa a um conjunto fechado — irmã do `buildEnumResponseFormat` (W5 item 9, c12 do I8): `keys` é
 * uma lista cujos itens só podem ser opções. Lista vazia = nenhuma escolha.
 */
export function buildEnumSetResponseFormat(options: readonly string[]) {
  return {
    type: 'json_schema' as const,
    json_schema: {
      name: 'selecao' as const,
      strict: true as const,
      schema: {
        type: 'object' as const,
        properties: { keys: { type: 'array' as const, items: { type: 'string' as const, enum: [...options] } } },
        required: ['keys'] as ['keys'],
        additionalProperties: false as const,
      },
    },
  };
}

/** Lê a escolha múltipla; JSON inválido ⇒ `[]`; item fora de `options` é descartado; duplicata conta uma vez. */
export function parseEnumSetChoice(content: string | null | undefined, options: readonly string[]): string[] {
  if (!content) return [];
  try {
    const keys = (JSON.parse(content) as { keys?: unknown }).keys;
    if (!Array.isArray(keys)) return [];
    return [...new Set(keys.filter((k): k is string => typeof k === 'string' && options.includes(k)))];
  } catch {
    return [];
  }
}

export function tryFixMalformedJson(jsonString: string): string | null {
  try {
    JSON.parse(jsonString);
    return jsonString; // already valid
  } catch {
    // fall through and attempt repairs
  }
  try {
    let fixed = jsonString.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'); // trailing commas
    fixed = fixed.replace(/(\{|,)\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":'); // unquoted keys
    fixed = fixed.replace(/[“”]/g, '"'); // smart double quotes → straight (old regex had straight quotes — a no-op)
    JSON.parse(fixed);
    return fixed;
  } catch {
    return null;
  }
}

export class OpenAIService {
  private openai: OpenAI;
  private static instance: OpenAIService;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      logger.error('[OpenAIService] OPENAI_API_KEY is not set');
      throw new Error('OpenAI API key not configured.');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // SDK-level resilience: bounded timeout + retries so a slow/transient failure fails cleanly.
      timeout: 60_000,
      maxRetries: 2,
    });
  }

  // Singleton pattern
  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  /**
   * `onUsage` (opcional) recebe o uso da chamada (I11). Chamadas coalescidas pelo RequestLock contam UMA vez:
   * só o `onUsage` de quem disparou a chamada é invocado; quem reaproveitou a promise em voo recebe 0 dela.
   */
  public async getChatCompletion(
    userMessage: string,
    systemPrompt: string = "You are a helpful assistant.",
    onUsage?: (usage: LlmUsage) => void
  ): Promise<string | null> {
    // Criar um identificador único baseado na mensagem e no prompt do sistema
    const requestId = this.createRequestHash(userMessage, systemPrompt);

    // Usar o mecanismo de lock para garantir apenas uma chamada concorrente
    return RequestLock.acquire(requestId, async function () {
      try {
        logger.debug('[OpenAIService] calling OpenAI', { requestId: requestId.substring(0, 8) });

        const instance = OpenAIService.getInstance();
        const completion = await instance.openai.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          model: CONFIG.MODELS.CHAT,
          max_tokens: MAX_TOKENS_CHAT,
        });
        OpenAIService.reportUsage(completion, onUsage);
        return completion.choices[0]?.message?.content;
      } catch (error) {
        logger.error('Error getting chat completion from OpenAI', { error });
        throw new Error('Failed to get response from AI service.', { cause: error });
      }
    });
  }

  /** Lê `completion.usage`/`completion.model` para o `onUsage`; `usage` ausente → 0 com aviso. */
  private static reportUsage(
    completion: { model: string; usage?: { prompt_tokens: number; completion_tokens: number } | null },
    onUsage?: (usage: LlmUsage) => void
  ): void {
    if (!onUsage) return;
    if (!completion.usage) {
      logger.warn('[OpenAIService] completion without usage; counting 0 tokens', { model: completion.model });
    }
    onUsage({
      model: completion.model,
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      completionTokens: completion.usage?.completion_tokens ?? 0,
    });
  }

  /**
   * Cria um hash simples para identificar unicamente uma requisição
   */
  private createRequestHash(userMessage: string, systemPrompt: string): string {
    // SHA-256: um hash de 32 bits colidia ("Aa" × "BB") e entregava a resposta de outro pedido.
    return `request-${createHash('sha256').update(JSON.stringify([systemPrompt, userMessage])).digest('hex')}`;
  }

  public async getChatCompletionWithHistory(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    model: string = CONFIG.MODELS.CHAT,
    onUsage?: (usage: LlmUsage) => void
  ): Promise<string | null> {
    try {
      const completion = await this.openai.chat.completions.create({
        messages: messages,
        model: model,
        max_tokens: MAX_TOKENS_CHAT,
      });
      OpenAIService.reportUsage(completion, onUsage);
      return completion.choices[0]?.message?.content;
    } catch (error) {
      logger.error('Error getting chat completion from OpenAI with history', { error });
      throw new Error('Failed to get response from AI service with history.', { cause: error });
    }
  }

  public async getChatCompletionWithTools(
    userMessage: string,
    systemPrompt: string,
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
    model: string = "gpt-4o"
  ): Promise<OpenAI.Chat.Completions.ChatCompletionMessage | null> {
    return this.getChatCompletionWithToolsAndHistory(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      tools,
      model
    );
  }

  public async getChatCompletionWithToolsAndHistory(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
    model: string = "gpt-4o",
    onUsage?: (usage: LlmUsage) => void
  ): Promise<OpenAI.Chat.Completions.ChatCompletionMessage | null> {
    try {
      const completion = await this.openai.chat.completions.create({
        messages: messages,
        model: model,
        tools: tools,
        tool_choice: "auto",
        max_tokens: MAX_TOKENS_AGENT,
      });
      OpenAIService.reportUsage(completion, onUsage);
      return completion.choices[0]?.message;
    } catch (error) {
      logger.error('Error getting chat completion from OpenAI with tools and history', { error });
      throw new Error('Failed to get response from AI service with tools and history.', { cause: error });
    }
  }

  /**
   * Escolhe uma das `options` para o `input` (ou `null`), com a saída restrita pelo schema (BE-INCR-KIT-SETOR-EMENDA-1
   * PR-K3, item 7c; L1 de 13/10). Modelo = `FALLBACK` (`gpt-4o-mini`), que suporta structured outputs.
   * Erro da API sobe para o chamador (a sugestão fiscal o trata como "sem sugestão").
   */
  public async classifyIntoEnum(input: string, systemPrompt: string, options: readonly string[]): Promise<string | null> {
    if (options.length === 0) return null;
    const completion = await this.openai.chat.completions.create({
      model: CONFIG.MODELS.FALLBACK,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ],
      response_format: buildEnumResponseFormat(options),
      max_tokens: 50,
    });
    return parseEnumChoice(completion.choices[0]?.message?.content, options);
  }

  /**
   * Escolhe ZERO OU MAIS `options` para o `input`, com a saída restrita pelo schema (W5 item 9 — irmão do
   * `classifyIntoEnum`, mesmo modelo `FALLBACK`). Erro da API sobe para o chamador.
   */
  public async classifyIntoEnumSet(input: string, systemPrompt: string, options: readonly string[]): Promise<string[]> {
    if (options.length === 0) return [];
    const completion = await this.openai.chat.completions.create({
      model: CONFIG.MODELS.FALLBACK,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ],
      response_format: buildEnumSetResponseFormat(options),
      max_tokens: 100,
    });
    return parseEnumSetChoice(completion.choices[0]?.message?.content, options);
  }

  /**
   * Conversa com saída presa a um `json_schema` strict (W6 item 6, F-W6-4 a — mesma técnica do `classifyIntoEnum`,
   * mesmo modelo `FALLBACK`). Devolve o conteúdo cru; quem chama relê com Zod. Erro da API sobe para o chamador.
   */
  public async completeWithJsonSchema(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    responseFormat: OpenAI.ResponseFormatJSONSchema,
  ): Promise<string | null> {
    const completion = await this.openai.chat.completions.create({
      model: CONFIG.MODELS.FALLBACK,
      messages,
      response_format: responseFormat,
      max_tokens: MAX_TOKENS_CHAT,
    });
    return completion.choices[0]?.message?.content ?? null;
  }
}