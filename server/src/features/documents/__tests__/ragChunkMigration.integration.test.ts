/**
 * RAG-PR-A item 3 — a migração `20261106130000_rag_chunk_embedding_stamp` contra SQLite real, lida do disco:
 *   • aplicada sobre um banco com chunks antigos, os trechos ficam e o carimbo nasce NULL;
 *   • reaplicada sobre si mesma não falha (prólogo defensivo; memória migracao-sqlite-nao-e-transacional).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { applyMigrations, MIGRATIONS_DIR } from '@test/helpers/migrations';

const TARGET = '20261106130000_rag_chunk_embedding_stamp';

function preMigrationDirs(): string[] {
  const todas = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((d) => fs.existsSync(path.join(MIGRATIONS_DIR, d, 'migration.sql')))
    .sort();
  const idx = todas.indexOf(TARGET);
  expect(idx).toBeGreaterThanOrEqual(0);
  return todas.slice(0, idx);
}

describe(`migração ${TARGET}`, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-chunk-mig-'));
  const db = path.join(dir, 'dev.db');

  beforeAll(() => {
    applyMigrations(db, preMigrationDirs());
    const c = new Database(db);
    c.exec(`PRAGMA foreign_keys=OFF;
      INSERT INTO "Document" ("id","userId","fileName","mimeType","fileType","fileSize","textContent","createdAt","updatedAt")
      VALUES ('d1','u1','contrato.pdf','application/pdf','PDF',10,'trecho um trecho dois','2026-10-01 10:00:00','2026-10-01 10:00:00');
      INSERT INTO "Chunk" ("id","text","index","documentId","createdAt")
      VALUES ('c1','trecho um',0,'d1','2026-10-01 10:00:00'), ('c2','trecho dois',1,'d1','2026-10-01 10:00:00');`);
    c.close();
  }, 180000);

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  });

  const read = () => {
    const c = new Database(db, { readonly: true });
    const rows = c.prepare('SELECT id, text, "index", documentId, embeddingModel, embeddingDims, embeddedAt FROM "Chunk" ORDER BY id').all();
    const idx = c.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'Chunk_documentId_idx'").all();
    const tmp = c.prepare("SELECT name FROM sqlite_master WHERE name = 'new_Chunk'").all();
    c.close();
    return { rows, idx, tmp };
  };

  const expected = [
    { id: 'c1', text: 'trecho um', index: 0, documentId: 'd1', embeddingModel: null, embeddingDims: null, embeddedAt: null },
    { id: 'c2', text: 'trecho dois', index: 1, documentId: 'd1', embeddingModel: null, embeddingDims: null, embeddedAt: null },
  ];

  it('chunks antigos ficam, com o carimbo NULL', () => {
    applyMigrations(db, [TARGET]);
    const { rows, idx, tmp } = read();
    expect(rows).toEqual(expected);
    expect(idx).toHaveLength(1);
    expect(tmp).toEqual([]);
  }, 60000);

  it('reaplicar não falha e converge', () => {
    expect(() => applyMigrations(db, [TARGET])).not.toThrow();
    expect(read().rows).toEqual(expected);
  }, 60000);
});
