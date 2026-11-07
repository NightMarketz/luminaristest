/**
 * Junta resolvedor + provedor: o único caminho de embedding do RAG (indexação, pergunta e reindexação), para o carimbo
 * gravado e o buscado saírem do mesmo lugar (item 6).
 */
import type { EmbeddingKeyResolver, EmbeddingProvider, EmbeddingProviderId } from './EmbeddingProvider';

export interface IUserEmbedder {
  /** Carimbo atual do usuário, sem chamar o provedor. */
  currentStamp(userId: string): Promise<string>;
  embed(userId: string, texts: string[]): Promise<{ vectors: Float32Array[]; stamp: string; dims: number }>;
}

export class UserEmbedder implements IUserEmbedder {
  constructor(
    private readonly resolver: EmbeddingKeyResolver,
    private readonly providers: Partial<Record<EmbeddingProviderId, EmbeddingProvider>>,
  ) {}

  async currentStamp(userId: string): Promise<string> {
    return (await this.resolver.resolve(userId)).stamp;
  }

  async embed(userId: string, texts: string[]): Promise<{ vectors: Float32Array[]; stamp: string; dims: number }> {
    const r = await this.resolver.resolve(userId);
    const provider = this.providers[r.provider];
    if (!provider) throw new Error(`Embedding provider '${r.provider}' is not configured`);
    const { vectors } = await provider.embed({ apiKey: r.apiKey, texts });
    return { vectors, stamp: r.stamp, dims: r.dims };
  }
}
