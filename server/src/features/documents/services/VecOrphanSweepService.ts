/**
 * RAG-PR-A item 9, caminho (2): a `vec0` mora num arquivo próprio, então a exclusão apaga o vetor antes do SQL e não
 * há transação comum. O que sobrar (linha da `vec0` sem `Chunk`) sai aqui, em páginas por `chunk_id`.
 */
import type { IChunkRepository } from '../repositories/IChunkRepository';

export interface VecOrphanIndex {
  listChunkIds(afterChunkId: string | null, limit: number): Promise<string[]>;
  deleteChunkIds(chunkIds: string[]): Promise<void>;
}

export type VecOrphanSweepSummary = { scanned: number; deleted: number; failed: number };

export class VecOrphanSweepService {
  constructor(
    private readonly index: VecOrphanIndex,
    private readonly chunks: Pick<IChunkRepository, 'findExistingIds'>,
    private readonly pageSize = 500,
  ) {}

  async sweep(): Promise<VecOrphanSweepSummary> {
    let after: string | null = null;
    let scanned = 0;
    let deleted = 0;
    for (;;) {
      const page = await this.index.listChunkIds(after, this.pageSize);
      if (page.length === 0) break;
      scanned += page.length;
      const alive = new Set(await this.chunks.findExistingIds(page));
      const orphans = page.filter((id) => !alive.has(id));
      await this.index.deleteChunkIds(orphans);
      deleted += orphans.length;
      after = page[page.length - 1];
    }
    return { scanned, deleted, failed: 0 };
  }
}
