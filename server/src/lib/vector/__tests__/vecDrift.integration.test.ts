/**
 * RAG-PR-A item 2 (decisão do dono, 2026-11-06: "vec0 em arquivo próprio"). Com o arquivo de vetores existindo ao lado
 * do banco principal, com linhas na `vec0`:
 *   • `prisma migrate diff` do banco principal contra o `schema.prisma` sai vazio (exit 0 com `--exit-code`). É o
 *     mesmo diff que o `prisma migrate dev` usa para propor migração, então ele não propõe `DROP`;
 *   • a `vec0` e as tabelas-sombra dela não estão no banco principal.
 * Banco e arquivo de vetores são temporários deste teste.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { applyMigrations, MIGRATIONS_DIR } from '@test/helpers/migrations';
import { VecIndex } from '../sqliteVec';

const SERVER_ROOT = path.resolve(MIGRATIONS_DIR, '../..');

describe('item 2 — o Prisma não vê a vec0', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vec-drift-'));
  const mainDb = path.join(dir, 'dev.db');
  const vecDb = path.join(dir, 'vectors.db');

  beforeAll(() => {
    const all = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((d) => fs.existsSync(path.join(MIGRATIONS_DIR, d, 'migration.sql')))
      .sort();
    applyMigrations(mainDb, all);
    const index = new VecIndex(vecDb);
    const v = new Float32Array(768);
    v[0] = 1;
    index.db.prepare('INSERT INTO chunk_vec(chunk_id, user_id, embedding_model, embedding) VALUES (?, ?, ?, ?)').run('c1', 'ana', 's@768', Buffer.from(v.buffer));
    index.close();
  }, 180000);

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  });

  it('prisma migrate diff do banco principal sai vazio', () => {
    const r = spawnSync(
      'npx',
      ['prisma', 'migrate', 'diff', '--from-url', `file:${mainDb}`, '--to-schema-datamodel', 'prisma/schema.prisma', '--exit-code'],
      { cwd: SERVER_ROOT, encoding: 'utf8', shell: process.platform === 'win32' },
    );
    expect({ status: r.status, out: `${r.stdout}${r.stderr}`.trim() }).toEqual({ status: 0, out: expect.stringContaining('No difference detected') });
  }, 120000);

  it('a vec0 está no arquivo de vetores e não no banco principal', () => {
    const main = new Database(mainDb, { readonly: true });
    const inMain = main.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'chunk_vec%'").all();
    main.close();
    const vec = new Database(vecDb, { readonly: true });
    const inVec = (vec.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'chunk_vec%'").all() as { name: string }[]).map((r) => r.name);
    vec.close();
    expect(inMain).toEqual([]);
    expect(inVec).toContain('chunk_vec');
  });
});
