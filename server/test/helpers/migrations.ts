/**
 * Aplica uma lista de migrações num SQLite com UM `prisma db execute`, não um por arquivo.
 * Cada spawn custa ~1 s (npx + boot do CLI); os harnesses de migração que montavam o banco arquivo a arquivo
 * pagavam 30–54 spawns (CounterpartyBackfill ~78 s no CI). Concatenar preserva a ordem e o texto de cada
 * migração — é o mesmo SQL, só que num script.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const SERVER_ROOT = path.resolve(__dirname, '../..');
export const MIGRATIONS_DIR = path.join(SERVER_ROOT, 'prisma', 'migrations');

export function applyMigrations(dbPath: string, dirs: string[]): void {
  const script = path.join(os.tmpdir(), `migrations-${process.pid}-${Date.now()}.sql`);
  // '\n' entre arquivos: uma migração que termina num comentário sem quebra de linha não engole a próxima.
  fs.writeFileSync(script, dirs.map((d) => fs.readFileSync(path.join(MIGRATIONS_DIR, d, 'migration.sql'), 'utf8')).join('\n'));
  try {
    execSync(`npx prisma db execute --file "${script}" --url "file:${dbPath}"`, { cwd: SERVER_ROOT, stdio: 'pipe' });
  } finally {
    fs.rmSync(script, { force: true });
  }
}
