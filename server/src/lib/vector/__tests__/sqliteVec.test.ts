/**
 * RAG-PR-A item 4 — `VecIndex`: boot idempotente, arquivo próprio (VECTOR_DB_PATH, default ao lado do DATABASE_URL) e
 * erro nomeado quando a extensão não carrega (régua A3). Cada teste usa um arquivo temporário seu.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { VecIndex, type VecExtensionError, resolveVectorDbPath } from '../sqliteVec';

describe('VecIndex', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vec-index-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('boot duas vezes no mesmo arquivo não falha e a chunk_vec existe uma vez', () => {
    const file = path.join(dir, 'vectors.db');
    const a = new VecIndex(file);
    a.ensureSchema();
    a.close();
    const b = new VecIndex(file);
    const rows = b.db.prepare("SELECT name FROM sqlite_master WHERE name = 'chunk_vec'").all();
    b.close();
    expect(rows).toHaveLength(1);
  });

  it('extensão que não carrega ⇒ VEC_EXTENSAO_NAO_CARREGADA, com o caminho do arquivo na mensagem', () => {
    const file = path.join(dir, 'vectors.db');
    jest.isolateModules(() => {
      jest.doMock('sqlite-vec', () => ({
        load: () => {
          throw new Error('cannot open shared object vec0.so');
        },
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('../sqliteVec') as typeof import('../sqliteVec');
      let err: unknown;
      try {
        new mod.VecIndex(file);
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(mod.VecExtensionError);
      expect((err as VecExtensionError).errorCode).toBe('VEC_EXTENSAO_NAO_CARREGADA');
      expect((err as Error).message).toContain(file);
      expect((err as Error).message).not.toContain('shared object');
    });
  });
});

describe('resolveVectorDbPath', () => {
  it('VECTOR_DB_PATH manda', () => {
    expect(resolveVectorDbPath({ VECTOR_DB_PATH: '/data/vectors.db', DATABASE_URL: 'file:/data/dev.db' })).toBe(
      path.resolve('/data/vectors.db'),
    );
  });

  it('sem VECTOR_DB_PATH: vectors.db no diretório do arquivo do DATABASE_URL (absoluto)', () => {
    expect(resolveVectorDbPath({ DATABASE_URL: 'file:/data/dev.db' })).toBe(path.join(path.resolve('/data'), 'vectors.db'));
  });

  it('URL relativa resolve contra server/prisma, como o Prisma', () => {
    const prismaDir = path.resolve(__dirname, '../../../../prisma');
    expect(resolveVectorDbPath({ DATABASE_URL: 'file:./dev.db' })).toBe(path.join(prismaDir, 'vectors.db'));
  });
});
