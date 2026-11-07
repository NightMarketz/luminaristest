/**
 * `ChunkVectorRepository` — RAG-PR-A item 7. A `vec0` (`chunk_vec`) vive num arquivo SQLite próprio (`VecIndex`), fora
 * de qualquer transação do Prisma: por isso a exclusão apaga o vetor ANTES do SQL e o `VecOrphanSweepScheduler` limpa
 * o que sobrar (item 9, caminho (2)).
 *
 * Filtros do `search`: `user_id` (PARTITION KEY), `embedding_model` = carimbo atual (metadado) e, com `documentIds`,
 * `chunk_id IN (...)` — os ids vêm da `Chunk` do banco principal (a `vec0` não guarda `documentId`).
 */
import type { Database } from 'better-sqlite3';
import prisma from '@/lib/prisma';
import type { IChunkVectorRepository } from './IChunkVectorRepository';

type ChunkIdsOf = (where: { documentIds?: string[]; documentId?: string }) => Promise<string[]>;

const defaultChunkIdsOf: ChunkIdsOf = async (where) => {
  const rows = await prisma.chunk.findMany({
    where: where.documentId ? { documentId: where.documentId } : { documentId: { in: where.documentIds ?? [] } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
};

function toBlob(v: Float32Array): Buffer {
  return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
}

export class ChunkVectorRepository implements IChunkVectorRepository {
  constructor(
    private readonly db: () => Database,
    private readonly chunkIdsOf: ChunkIdsOf = defaultChunkIdsOf,
  ) {}

  async upsert(rows: { chunkId: string; userId: string; stamp: string; vector: Float32Array }[]): Promise<void> {
    if (rows.length === 0) return;
    const db = this.db();
    // vec0 não tem UPSERT: apaga e insere, tudo numa transação do arquivo de vetor (o lote entra inteiro ou nada).
    const del = db.prepare('DELETE FROM chunk_vec WHERE chunk_id = ?');
    const ins = db.prepare('INSERT INTO chunk_vec(chunk_id, user_id, embedding_model, embedding) VALUES (?, ?, ?, ?)');
    db.transaction(() => {
      for (const r of rows) {
        del.run(r.chunkId);
        ins.run(r.chunkId, r.userId, r.stamp, toBlob(r.vector));
      }
    })();
  }

  async search(q: {
    userId: string;
    stamp: string;
    vector: Float32Array;
    documentIds?: string[];
    limit: number;
  }): Promise<{ chunkId: string; distance: number }[]> {
    let chunkFilter = '';
    const params: unknown[] = [toBlob(q.vector), q.limit, q.userId, q.stamp];
    if (q.documentIds) {
      const ids = q.documentIds.length ? await this.chunkIdsOf({ documentIds: q.documentIds }) : [];
      if (ids.length === 0) return [];
      chunkFilter = ' AND chunk_id IN (SELECT value FROM json_each(?))';
      params.push(JSON.stringify(ids));
    }
    const rows = this.db()
      .prepare(
        `SELECT chunk_id, distance FROM chunk_vec
         WHERE embedding MATCH ? AND k = ? AND user_id = ? AND embedding_model = ?${chunkFilter}
         ORDER BY distance`,
      )
      .all(...params) as { chunk_id: string; distance: number }[];
    return rows.map((r) => ({ chunkId: r.chunk_id, distance: r.distance }));
  }

  async deleteByDocument(documentId: string): Promise<void> {
    const ids = await this.chunkIdsOf({ documentId });
    await this.deleteChunkIds(ids);
  }

  async deleteByUser(userId: string): Promise<void> {
    this.db().prepare('DELETE FROM chunk_vec WHERE user_id = ?').run(userId);
  }

  /** Para a varredura de órfãos e a idempotência do pipeline. */
  async deleteChunkIds(chunkIds: string[]): Promise<void> {
    if (chunkIds.length === 0) return;
    this.db()
      .prepare('DELETE FROM chunk_vec WHERE chunk_id IN (SELECT value FROM json_each(?))')
      .run(JSON.stringify(chunkIds));
  }

  async findPresentChunkIds(chunkIds: string[], stamp: string): Promise<Set<string>> {
    if (chunkIds.length === 0) return new Set();
    const rows = this.db()
      .prepare('SELECT chunk_id FROM chunk_vec WHERE chunk_id IN (SELECT value FROM json_each(?)) AND embedding_model = ?')
      .all(JSON.stringify(chunkIds), stamp) as { chunk_id: string }[];
    return new Set(rows.map((r) => r.chunk_id));
  }

  /** Página de ids da vec0, em ordem, para a varredura de órfãos. */
  async listChunkIds(afterChunkId: string | null, limit: number): Promise<string[]> {
    const rows = this.db()
      .prepare(
        afterChunkId === null
          ? 'SELECT chunk_id FROM chunk_vec ORDER BY chunk_id LIMIT ?'
          : 'SELECT chunk_id FROM chunk_vec WHERE chunk_id > ? ORDER BY chunk_id LIMIT ?',
      )
      .all(...(afterChunkId === null ? [limit] : [afterChunkId, limit])) as { chunk_id: string }[];
    return rows.map((r) => r.chunk_id);
  }
}
