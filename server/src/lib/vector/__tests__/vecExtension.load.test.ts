/**
 * RAG-PR-A item 1 (BE-INCR-RAG-DOCUMENTOS-brief.md §1): carga da extensão `sqlite-vec`.
 *
 * Mede o caminho (2) — uma conexão `better-sqlite3` própria para vetor — num banco temporário:
 * carrega a extensão, cria a `vec0` com o DDL da §2.2 (PARTITION KEY `user_id`, metadado
 * `embedding_model`, cosine), insere e faz KNN. Roda no projeto `unit` (sem o banco de teste), então
 * entra no job de testes do CI Linux; o resultado vai no corpo do PR.
 *
 * O caminho (1) (driver adapter do Prisma) foi medido só no Windows, fora do repo: ver o retorno do PR.
 */
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import fs from 'fs';
import os from 'os';
import path from 'path';

const DIMS = 768;

/** Vetor unitário determinístico: 1 na posição `hot`, `tilt` na posição `hot + 1`. */
function vec(hot: number, tilt = 0): Buffer {
  const a = new Float32Array(DIMS);
  a[hot] = 1;
  if (tilt) a[hot + 1] = tilt;
  return Buffer.from(a.buffer);
}

describe('sqlite-vec — carga da extensão (caminho 2: conexão better-sqlite3 própria)', () => {
  let dir: string;
  let db: Database.Database;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vec-load-'));
    db = new Database(path.join(dir, 'vec.db'));
    sqliteVec.load(db);
  });

  afterAll(() => {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('carrega a extensão e informa a versão (fixada em 0.1.9)', () => {
    const row = db.prepare('SELECT vec_version() AS v').get() as { v: string };
    // eslint-disable-next-line no-console -- medida pedida pelo BRIEF: a versão vai ao corpo do PR
    console.info(`[vecExtension.load] plataforma=${process.platform}-${process.arch} sqlite-vec=${row.v}`);
    expect(row.v).toBe('v0.1.9');
  });

  it('cria a vec0 da §2.2, insere e faz KNN filtrado por partição e metadado', () => {
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS chunk_vec USING vec0(
      chunk_id TEXT PRIMARY KEY,
      user_id TEXT PARTITION KEY,
      embedding_model TEXT,
      embedding FLOAT[${DIMS}] distance_metric=cosine
    )`);
    // idempotente
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS chunk_vec USING vec0(
      chunk_id TEXT PRIMARY KEY,
      user_id TEXT PARTITION KEY,
      embedding_model TEXT,
      embedding FLOAT[${DIMS}] distance_metric=cosine
    )`);

    const ins = db.prepare(
      'INSERT INTO chunk_vec(chunk_id, user_id, embedding_model, embedding) VALUES (?, ?, ?, ?)',
    );
    ins.run('ana-perto', 'ana', 'openai:text-embedding-3-small@768', vec(0, 0.2));
    ins.run('ana-longe', 'ana', 'openai:text-embedding-3-small@768', vec(5));
    ins.run('ana-carimbo-velho', 'ana', 'openai:text-embedding-3-small@1536', vec(0));
    // O vizinho mais próximo da consulta é do outro dono (régua A2).
    ins.run('bia-identico', 'bia', 'openai:text-embedding-3-small@768', vec(0));

    const rows = db
      .prepare(
        `SELECT chunk_id, distance FROM chunk_vec
         WHERE embedding MATCH ? AND k = 10 AND user_id = ? AND embedding_model = ?
         ORDER BY distance`,
      )
      .all(vec(0), 'ana', 'openai:text-embedding-3-small@768') as { chunk_id: string; distance: number }[];

    expect(rows.map((r) => r.chunk_id)).toEqual(['ana-perto', 'ana-longe']);
    expect(rows[0].distance).toBeLessThan(rows[1].distance);
  });
});
