/**
 * Porta de embedding — BE-INCR-RAG-DOCUMENTOS §2.3 (itens 5 e 6).
 * O carimbo (`stamp`) identifica o espaço vetorial: `<provider>:<model>@<dims>`. Indexação e pergunta usam o MESMO
 * resolvedor, então o carimbo de quem grava e de quem busca sempre bate.
 */
import { AppError } from '@/lib/errors';

export const EMBEDDING_DIMS = 768 as const;

export type EmbeddingProviderId = 'openai' | 'gemini';

export interface EmbeddingProvider {
  readonly id: EmbeddingProviderId;
  embed(input: { apiKey: string; texts: string[] }): Promise<{ vectors: Float32Array[]; model: string; dims: 768 }>;
}

export type EmbeddingResolution = {
  provider: EmbeddingProviderId;
  apiKey: string;
  model: string;
  dims: typeof EMBEDDING_DIMS;
  stamp: string;
  source: 'USER' | 'INSTANCE';
};

export interface EmbeddingKeyResolver {
  resolve(userId: string): Promise<EmbeddingResolution>;
}

export function embeddingStamp(provider: EmbeddingProviderId, model: string, dims: number): string {
  return `${provider}:${model}@${dims}`;
}

/** Nenhuma chave para gerar embedding (item 6; régua A3). */
export class EmbeddingSemCredencialError extends AppError {
  constructor() {
    super('Nenhuma chave de embedding configurada para indexar ou buscar documentos.', 503, 'EMBEDDING_SEM_CREDENCIAL');
    Object.setPrototypeOf(this, EmbeddingSemCredencialError.prototype);
  }
}
