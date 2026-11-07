import type { LlmUsage } from '../openai/llmUsage';

/**
 * Porta única de provedor de LLM dos teammates (BE-INCR-TEAMMATES PR-1, item 5; contrato §2.3 do BRIEF
 * `docs/accounting/BE-INCR-TEAMMATES-brief.md`). Cada adaptador (Anthropic, Gemini, OpenAI) traduz deste formato para o
 * SDK oficial do provedor (F-TM-9) e de volta. A chave vem sempre na chamada (BYOK, F-TM-6 b): nenhum adaptador lê
 * chave de ambiente.
 */
export type LlmProviderId = 'anthropic' | 'openai' | 'gemini';

export type LlmToolCall = { id: string; name: string; arguments: Record<string, unknown> };
export type LlmMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: LlmToolCall[] }
  | { role: 'tool'; toolCallId: string; content: string };
export type LlmToolDef = { name: string; description: string; parameters: Record<string, unknown> }; // JSON Schema
export type LlmAssistantMessage = Extract<LlmMessage, { role: 'assistant' }>;

export type LlmCompleteInput = {
  apiKey: string;
  model: string;
  messages: LlmMessage[];
  tools?: LlmToolDef[];
  maxTokens: number;
};
export type LlmCompleteResult = { message: LlmAssistantMessage; usage: LlmUsage };

export interface LlmProvider {
  readonly id: LlmProviderId;
  complete(input: LlmCompleteInput): Promise<LlmCompleteResult>;
}

/**
 * Erro tipado da porta. `TIMEOUT` é o estouro do prazo por chamada (F-TM-E1, §8.2 do BRIEF): transitório, como
 * RATE_LIMIT, SERVER e QUOTA — os quatro disparam a reserva (item 9). AUTH e BAD_REQUEST não.
 */
export type LlmProviderErrorKind = 'RATE_LIMIT' | 'SERVER' | 'QUOTA' | 'AUTH' | 'BAD_REQUEST' | 'TIMEOUT';
export class LlmProviderError extends Error {
  constructor(
    readonly kind: LlmProviderErrorKind,
    message: string,
    readonly provider?: LlmProviderId,
  ) {
    super(message);
    this.name = 'LlmProviderError';
  }
}

const TRANSIENT: ReadonlySet<LlmProviderErrorKind> = new Set(['RATE_LIMIT', 'SERVER', 'QUOTA', 'TIMEOUT']);

/** Item 9: só erro transitório do primário dispara a reserva; 400/401 não. */
export function triggersFallback(error: unknown): error is LlmProviderError {
  return error instanceof LlmProviderError && TRANSIENT.has(error.kind);
}

/** Classificação por status HTTP comum aos adaptadores. `quota` = o corpo do erro diz que a cota/crédito acabou. */
export function kindFromHttpStatus(status: number | undefined, quota = false): LlmProviderErrorKind {
  if (quota) return 'QUOTA';
  if (status === 429) return 'RATE_LIMIT';
  if (status === 401 || status === 403) return 'AUTH';
  if (status !== undefined && status >= 500) return 'SERVER';
  if (status !== undefined && status >= 400) return 'BAD_REQUEST';
  // Sem status (rede caiu, conexão recusada): falha de transporte, tratada como do servidor.
  return 'SERVER';
}

/** F-TM-E1 a: prazo padrão de 180 s por chamada, configurável por `LLM_CALL_TIMEOUT_MS`. */
export const LLM_CALL_TIMEOUT_DEFAULT_MS = 180_000;
export const LLM_CALL_TIMEOUT_ENV = 'LLM_CALL_TIMEOUT_MS';

export function resolveLlmCallTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env[LLM_CALL_TIMEOUT_ENV]?.trim();
  if (!raw) return LLM_CALL_TIMEOUT_DEFAULT_MS;
  const ms = Number(raw);
  if (!Number.isInteger(ms) || ms < 1) {
    throw new Error(`${LLM_CALL_TIMEOUT_ENV} malformado: inteiro de milissegundos ≥ 1 (recebido "${raw}").`);
  }
  return ms;
}

/**
 * Roda `call` com prazo: estourado, aborta o sinal entregue ao SDK e rejeita com `LlmProviderError('TIMEOUT')`,
 * sem esperar o SDK desistir.
 */
export async function withDeadline<T>(
  provider: LlmProviderId,
  timeoutMs: number,
  call: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new LlmProviderError('TIMEOUT', `O provedor ${LLM_PROVIDER_LABEL[provider]} não respondeu em ${timeoutMs} ms.`, provider));
    }, timeoutMs);
  });
  try {
    return await Promise.race([call(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/** Nome exibido do provedor (régua A3: mensagens nomeiam o provedor pelo nome, nunca por id). */
export const LLM_PROVIDER_LABEL: Record<LlmProviderId, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Gemini',
};

/** Argumentos de chamada de ferramenta: objeto JSON; qualquer outra coisa vira `{}` (o modelo recebe o erro da ferramenta). */
export function toArgsRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
