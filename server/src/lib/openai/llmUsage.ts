/**
 * Uso de tokens das chamadas de chat (BRIEF BE-INCR-CHAT-AGENT §2.4; F-I11-1 → a, F-I11-4 → b).
 * `LlmUsage` = uma chamada; `TurnUsage` = o turno do ASSISTANT (soma + detalhe por chamada, porque o preço
 * por token difere por modelo e a soma sozinha não vira custo).
 */
export type LlmUsage = { model: string; promptTokens: number; completionTokens: number };

export type TurnUsage = {
  promptTokens: number;
  completionTokens: number;
  /** Modelos distintos na ordem das chamadas, unidos por "+"; `null` quando o turno não chamou o LLM. */
  model: string | null;
  calls: LlmUsage[];
};

/** Soma as chamadas de um turno. Sem chamadas → 0/0 e `model` null (ex.: confirmação de proposta). */
export function toTurnUsage(calls: LlmUsage[]): TurnUsage {
  const models = [...new Set(calls.map(c => c.model))];
  return {
    promptTokens: calls.reduce((s, c) => s + c.promptTokens, 0),
    completionTokens: calls.reduce((s, c) => s + c.completionTokens, 0),
    model: models.length ? models.join('+') : null,
    calls: [...calls],
  };
}
