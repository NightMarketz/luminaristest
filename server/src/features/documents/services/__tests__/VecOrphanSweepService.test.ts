/**
 * RAG-PR-A item 9, caminho (2): um vetor órfão plantado (linha da vec0 sem Chunk) some na varredura; os vivos ficam.
 * vec0 real num arquivo temporário próprio; a Chunk é um fake (o mapeamento de ids é o que importa aqui).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { VecIndex } from '@/lib/vector/sqliteVec';
import { ChunkVectorRepository } from '../../repositories/ChunkVectorRepository';
import { VecOrphanSweepService } from '../VecOrphanSweepService';

describe('VecOrphanSweepService', () => {
  let dir: string;
  let index: VecIndex;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vec-orphan-'));
    index = new VecIndex(path.join(dir, 'vectors.db'));
  });
  afterEach(() => {
    index.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('apaga só a linha sem Chunk, varrendo em páginas', async () => {
    const repo = new ChunkVectorRepository(() => index.db, async () => []);
    const v = new Float32Array(768);
    v[0] = 1;
    await repo.upsert(['c1', 'c2', 'c3', 'orfao', 'c5'].map((chunkId) => ({ chunkId, userId: 'ana', stamp: 's@768', vector: v })));
    const alive = new Set(['c1', 'c2', 'c3', 'c5']);
    const svc = new VecOrphanSweepService(repo, { findExistingIds: async (ids) => ids.filter((id) => alive.has(id)) }, 2);

    const summary = await svc.sweep();

    expect(summary).toEqual({ scanned: 5, deleted: 1, failed: 0 });
    expect(await repo.listChunkIds(null, 10)).toEqual(['c1', 'c2', 'c3', 'c5']);
  });
});
