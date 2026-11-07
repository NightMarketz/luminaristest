/**
 * Adaptador OpenAI da porta `EmbeddingProvider` (RAG-PR-A item 5): embrulha o `EmbeddingService` com
 * `dimensions: 768` (text-embedding-3 aceita dimensão reduzida). Dimensão devolvida ≠ 768 → erro (do próprio serviço).
 */
import { EmbeddingService, type IEmbeddingService } from '@/lib/vector/embedding';
import { EMBEDDING_DIMS, type EmbeddingProvider } from './EmbeddingProvider';

export const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly id = 'openai' as const;

  constructor(
    private readonly build: (apiKey: string) => IEmbeddingService = (apiKey) =>
      new EmbeddingService({ apiKey, model: OPENAI_EMBEDDING_MODEL, dimensions: EMBEDDING_DIMS }),
  ) {}

  async embed(input: { apiKey: string; texts: string[] }): Promise<{ vectors: Float32Array[]; model: string; dims: 768 }> {
    const raw = await this.build(input.apiKey).embedTexts(input.texts);
    for (const v of raw) {
      if (v.length !== EMBEDDING_DIMS) {
        throw new Error(`Invalid embedding dimension: expected ${EMBEDDING_DIMS}, got ${v.length}`);
      }
    }
    return { vectors: raw.map((v) => Float32Array.from(v)), model: OPENAI_EMBEDDING_MODEL, dims: EMBEDDING_DIMS };
  }
}
