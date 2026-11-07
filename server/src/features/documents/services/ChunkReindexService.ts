/**
 * RAG-PR-A item 10 — reindexação. Refaz o embedding, a partir de `Chunk.text`, de todo trecho sem carimbo ou com
 * carimbo diferente do atual do dono. É também a migração de saída do índice externo antigo: os trechos antigos não têm vetor local.
 * Roda por usuário (o carimbo é do resolvedor de cada um) e em páginas por id.
 */
import type { IChunkRepository } from '../repositories/IChunkRepository';
import type { IChunkVectorRepository } from '../repositories/IChunkVectorRepository';
import type { IUserEmbedder } from '@/lib/embedding/UserEmbedder';

export type ReindexSummary = { users: number; reindexed: number };

export class ChunkReindexService {
  constructor(
    private readonly chunks: Pick<IChunkRepository, 'findStale' | 'setEmbeddingStamp' | 'findOwnerIdsWithChunks'>,
    private readonly vectors: Pick<IChunkVectorRepository, 'upsert'>,
    private readonly embedder: IUserEmbedder,
    private readonly pageSize = 100,
  ) {}

  async reindex(opts: { userId?: string } = {}): Promise<ReindexSummary> {
    const userIds = opts.userId ? [opts.userId] : await this.chunks.findOwnerIdsWithChunks();
    let reindexed = 0;
    for (const userId of userIds) {
      const stamp = await this.embedder.currentStamp(userId);
      let afterId: string | undefined;
      for (;;) {
        const page = await this.chunks.findStale({ stamp, userId, afterId, limit: this.pageSize });
        if (page.length === 0) break;
        const embedded = await this.embedder.embed(userId, page.map((c) => c.text));
        await this.vectors.upsert(page.map((c, i) => ({ chunkId: c.id, userId, stamp: embedded.stamp, vector: embedded.vectors[i] })));
        await this.chunks.setEmbeddingStamp(page.map((c) => c.id), embedded.stamp, embedded.dims);
        reindexed += page.length;
        afterId = page[page.length - 1].id;
      }
    }
    return { users: userIds.length, reindexed };
  }
}
