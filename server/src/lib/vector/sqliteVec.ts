/**
 * VecIndex — BE-INCR-RAG-DOCUMENTOS RAG-PR-A item 4 (DDL da §2.2).
 *
 * A `vec0` mora num arquivo SQLite PRÓPRIO (decisão do dono, chat, 2026-11-06: "vec0 em arquivo próprio"), aberto só
 * por esta conexão `better-sqlite3` com a extensão `sqlite-vec` (caminho (2) do item 1). O Prisma nunca abre esse
 * arquivo, então `prisma migrate` não vê a `vec0` nem as tabelas-sombra (item 2).
 *
 * Caminho do arquivo: `VECTOR_DB_PATH`; sem ela, `vectors.db` no mesmo diretório do arquivo do `DATABASE_URL`.
 * `sqlite-vec` 0.1.9 tem PARTITION KEY e metadado filtrável no KNN (medido no item 1), então não há pós-filtro.
 */
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import fs from 'fs';
import path from 'path';
import { AppError } from '@/lib/errors';

export const VEC_DIMS = 768;

export const CHUNK_VEC_DDL = `CREATE VIRTUAL TABLE IF NOT EXISTS chunk_vec USING vec0(
  chunk_id TEXT PRIMARY KEY,
  user_id TEXT PARTITION KEY,
  embedding_model TEXT,
  embedding FLOAT[${VEC_DIMS}] distance_metric=cosine
)`;

/** A extensão não carregou (binário ausente na plataforma, arquivo inacessível). Régua A3: mensagem nomeada. */
export class VecExtensionError extends AppError {
  constructor(vectorDbPath: string, cause: unknown) {
    super(
      `Índice de vetores indisponível: a extensão sqlite-vec não carregou para ${vectorDbPath}.`,
      503,
      'VEC_EXTENSAO_NAO_CARREGADA',
    );
    this.cause = cause;
    Object.setPrototypeOf(this, VecExtensionError.prototype);
  }
}

/** Diretório do arquivo SQLite do `DATABASE_URL`. URL relativa resolve contra `server/prisma` (regra do Prisma). */
function databaseDir(databaseUrl: string): string {
  const file = databaseUrl.replace(/^file:/, '').split('?')[0];
  const schemaDir = path.resolve(__dirname, '../../../prisma');
  return path.dirname(path.resolve(schemaDir, file));
}

export function resolveVectorDbPath(source: NodeJS.ProcessEnv = process.env): string {
  if (source.VECTOR_DB_PATH) return path.resolve(source.VECTOR_DB_PATH);
  if (!source.DATABASE_URL) throw new Error('VECTOR_DB_PATH or DATABASE_URL is required to locate the vector index');
  return path.join(databaseDir(source.DATABASE_URL), 'vectors.db');
}

export class VecIndex {
  readonly db: Database.Database;

  constructor(readonly filePath: string) {
    let db: Database.Database | undefined;
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      db = new Database(filePath);
      sqliteVec.load(db);
    } catch (error) {
      db?.close();
      throw new VecExtensionError(filePath, error);
    }
    this.db = db;
    this.db.pragma('journal_mode = WAL');
    this.ensureSchema();
  }

  /** Idempotente: o boot pode rodar quantas vezes for. */
  ensureSchema(): void {
    this.db.exec(CHUNK_VEC_DDL);
  }

  close(): void {
    this.db.close();
  }
}

let instance: VecIndex | null = null;

/** Singleton do processo (a conexão é síncrona e única por arquivo). */
export function getVecIndex(): VecIndex {
  if (!instance) instance = new VecIndex(resolveVectorDbPath());
  return instance;
}
