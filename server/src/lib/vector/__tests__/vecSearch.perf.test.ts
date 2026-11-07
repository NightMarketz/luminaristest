/**
 * RAG-PR-A item 11 — medida: 20 mil trechos × 768 dimensões num usuário só (pior caso da partição), p95 por busca com
 * teto de 300 ms (gatilho do PRE-ADR-RAG-DOCUMENTOS §6). O número medido vai ao dono: o teste o imprime.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { VecIndex } from '../sqliteVec';
import { ChunkVectorRepository } from '@/features/documents/repositories/ChunkVectorRepository';

const N = 20_000;
const DIMS = 768;
const QUERIES = 40;
const P95_CEILING_MS = 300;
const STAMP = 'openai:text-embedding-3-small@768';

/** Gerador determinístico (LCG): a mesma base em toda máquina. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296 - 0.5;
  };
}

function randomVector(next: () => number): Float32Array {
  const v = new Float32Array(DIMS);
  for (let j = 0; j < DIMS; j++) v[j] = next();
  return v;
}

describe('busca na vec0: 20 mil trechos de 768 dimensões', () => {
  let dir: string;
  let index: VecIndex;
  let repo: ChunkVectorRepository;

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vec-perf-'));
    index = new VecIndex(path.join(dir, 'vectors.db'));
    repo = new ChunkVectorRepository(() => index.db, async () => []);
    const next = rng(42);
    for (let start = 0; start < N; start += 2000) {
      const rows = [];
      for (let i = start; i < start + 2000; i++) {
        rows.push({ chunkId: `c${String(i).padStart(6, '0')}`, userId: 'ana', stamp: STAMP, vector: randomVector(next) });
      }
      await repo.upsert(rows);
    }
  }, 300_000);

  afterAll(() => {
    index?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it(`p95 de ${QUERIES} buscas (k = 10) até ${P95_CEILING_MS} ms`, async () => {
    const next = rng(7);
    const times: number[] = [];
    for (let q = 0; q < QUERIES; q++) {
      const v = randomVector(next);
      const t0 = process.hrtime.bigint();
      const hits = await repo.search({ userId: 'ana', stamp: STAMP, vector: v, limit: 10 });
      times.push(Number(process.hrtime.bigint() - t0) / 1e6);
      expect(hits).toHaveLength(10);
    }
    times.sort((a, b) => a - b);
    const p95 = times[Math.ceil(0.95 * times.length) - 1];
    const p50 = times[Math.floor(times.length / 2)];
    // eslint-disable-next-line no-console -- medida pedida pelo BRIEF (item 11): o número vai ao dono
    console.info(
      `[vecSearch.perf] plataforma=${process.platform}-${process.arch} N=${N} dims=${DIMS} p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms max=${times[times.length - 1].toFixed(1)}ms`,
    );
    expect(p95).toBeLessThanOrEqual(P95_CEILING_MS);
  }, 120_000);
});
