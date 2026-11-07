import type {
  LlmCompleteResult,
  LlmMessage,
  LlmProvider,
  LlmProviderId,
  LlmToolDef,
} from '../../../lib/llm/LlmProvider';
import { LLM_PROVIDER_LABEL, triggersFallback } from '../../../lib/llm/LlmProvider';
import { LLM_SEM_CREDENCIAL } from '../models/LlmCredential.model';
import type { ILlmApiKeySource } from './LlmCredentialService';

/** O que o chamador precisa do teammate (subconjunto do model `Teammate`, §2.1). */
export type TeammateLlmConfig = {
  name: string;
  provider: LlmProviderId;
  model: string;
  fallbackProvider?: LlmProviderId | null;
  fallbackModel?: string | null;
};

/** Item 8: sem chave do tenant para o provedor do teammate. O turno vai a `FAILED` sem chamar provedor (runner, PR-3). */
export class LlmSemCredencialError extends Error {
  readonly code = LLM_SEM_CREDENCIAL;
  constructor(
    readonly teammateName: string,
    readonly provider: LlmProviderId,
  ) {
    super(`O teammate "${teammateName}" não tem credencial do provedor ${LLM_PROVIDER_LABEL[provider]} cadastrada.`);
    this.name = 'LlmSemCredencialError';
  }
}

export type TeammateLlmResult = LlmCompleteResult & {
  /** Qual provedor respondeu (item 9: "o turno grava qual respondeu"). */
  provider: LlmProviderId;
  model: string;
  usedFallback: boolean;
};

/**
 * Chamada de LLM de um turno de teammate (BE-INCR-TEAMMATES PR-1, itens 8 e 9).
 *
 * - Item 8 — só BYOK (F-TM-6 b): a chave vem do `ILlmApiKeySource` (credencial do tenant); nenhuma chave de IA da
 *   plataforma é lida. Sem chave do primário ⇒ `LlmSemCredencialError`, sem chamar provedor.
 * - Item 9 — reserva: erro transitório do primário (RATE_LIMIT, SERVER, QUOTA e o TIMEOUT do F-TM-E1) tenta **uma vez**
 *   o `fallbackProvider`, se o tenant tiver chave dele; sem chave da reserva, o erro do primário sobe. AUTH/BAD_REQUEST
 *   não disparam reserva.
 */
export class TeammateLlmCaller {
  constructor(
    private readonly keys: ILlmApiKeySource,
    private readonly providers: Partial<Record<LlmProviderId, LlmProvider>>,
  ) {}

  async complete(
    userId: string,
    teammate: TeammateLlmConfig,
    request: { messages: LlmMessage[]; tools?: LlmToolDef[]; maxTokens: number },
  ): Promise<TeammateLlmResult> {
    const apiKey = await this.keys.findApiKey(userId, teammate.provider);
    if (!apiKey) throw new LlmSemCredencialError(teammate.name, teammate.provider);
    try {
      return await this.call(teammate.provider, teammate.model, apiKey, request, false);
    } catch (error) {
      const fallback = teammate.fallbackProvider;
      // Reserva sem `fallbackModel` não tem modelo definido no outro provedor: não chama (lacuna L-PR1-3 do retorno).
      if (!triggersFallback(error) || !fallback || !teammate.fallbackModel) throw error;
      const fallbackKey = await this.keys.findApiKey(userId, fallback);
      if (!fallbackKey) throw error;
      return this.call(fallback, teammate.fallbackModel, fallbackKey, request, true);
    }
  }

  private async call(
    providerId: LlmProviderId,
    model: string,
    apiKey: string,
    request: { messages: LlmMessage[]; tools?: LlmToolDef[]; maxTokens: number },
    usedFallback: boolean,
  ): Promise<TeammateLlmResult> {
    const provider = this.providers[providerId];
    if (!provider) throw new Error(`Provedor ${LLM_PROVIDER_LABEL[providerId]} sem adaptador registrado.`);
    const res = await provider.complete({ apiKey, model, ...request });
    return { ...res, provider: providerId, model, usedFallback };
  }
}
