#!/usr/bin/env node
// db-backup — cópia atômica e íntegra do dev.db via SQLite VACUUM INTO.
//
// Item B-1 do plano pré-dados-reais (BRIEF-W1-C). `VACUUM INTO` produz uma cópia compactada e
// consistente do banco SEM travar o processo do server nem exigir lock exclusivo prolongado — e
// sem tocar o arquivo de origem (ela só é LIDA). Verifica a cópia com `PRAGMA integrity_check` +
// contagem da tabela sentinela `journal_entries` comparada contra a fonte, medida ANTES do vacuum.
//
// Reusa o padrão de conexão do ../scripts/smoke-migration-gate.mjs (PrismaClient apontado por
// datasources.db.url + generated/prisma via createRequire) — sem dependência nova (o projeto não
// tem better-sqlite3/sqlite3; grep confirma 0 hits fora de @prisma/client).
//
// Uso:  node scripts/db-backup.mjs [--db <caminho>] [--out-dir <pasta>]
//   --db        default: DATABASE_URL do ambiente (resolvido relativo a server/prisma/, o mesmo
//               jeito que o Prisma CLI resolve — é a origem do path "aninhado"), ou
//               server/prisma/prisma/dev.db se DATABASE_URL não estiver setada (o real é o
//               aninhado; server/prisma/dev.db é isca de 0 byte — memória dev-db-real-path-is-nested)
//   --out-dir   default: server/prisma/backups/ — coberto pelo .gitignore global *.db/*.db.*, sem
//               entrada nova necessária. Adequado só para dev/staging: em produção (VPS por
//               cliente) o destino certo é fora do container/volume da app — decisão do dono ainda
//               aberta (ADR-M2-deploy-topology.md §7 item 1). --out-dir existe para não bloquear
//               nisso, não para resolvê-lo.
//
// Saída (stdout): path do backup + integrity_check + contagem sentinela (fonte × cópia).
// Exit 1 se integrity_check !== 'ok' OU se a contagem sentinela não bater com a fonte.

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const SERVER = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { PrismaClient } = require(join(SERVER, 'generated', 'prisma'));

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : (args[i + 1] ?? fallback);
};

function resolveSourcePath() {
  const dbArg = flag('db', null);
  if (dbArg) return resolve(dbArg);
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && envUrl.startsWith('file:')) {
    // O Prisma resolve DATABASE_URL relativo à pasta do schema.prisma (server/prisma/), não ao
    // cwd — é exatamente a origem do path "aninhado" quando o .env tem `file:./prisma/dev.db`.
    return resolve(join(SERVER, 'prisma'), envUrl.slice('file:'.length));
  }
  return join(SERVER, 'prisma', 'prisma', 'dev.db');
}

const SOURCE = resolveSourcePath();
const OUT_DIR = resolve(flag('out-dir', join(SERVER, 'prisma', 'backups')));

if (!existsSync(SOURCE)) {
  console.error(`FALHOU: banco de origem não existe: ${SOURCE}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

// Granularidade de segundo já é suficiente (um backup por segundo não é caso real) — e o SQLite
// recusa `VACUUM INTO` se o destino já existir, então precisamos de um nome novo a cada rodada.
const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
const destPath = join(OUT_DIR, `dev-${ts}.db`);

if (existsSync(destPath)) {
  console.error(`FALHOU: destino já existe (VACUUM INTO recusa sobrescrever): ${destPath}`);
  process.exit(1);
}

const client = (url) => new PrismaClient({ datasources: { db: { url } } });
const source = client(`file:${SOURCE.replace(/\\/g, '/')}`);

console.log(`origem: ${SOURCE}`);

const [{ count: sentinelBefore }] = await source.$queryRawUnsafe(
  `SELECT COUNT(*) AS count FROM journal_entries`,
);

// `VACUUM INTO` não aceita parâmetro bindado (`?`) para o path do destino em todo driver SQLite —
// escapamos manualmente (aspas simples dobradas), NUNCA um placeholder.
const escapedDest = destPath.replace(/'/g, "''");
try {
  await source.$executeRawUnsafe(`VACUUM INTO '${escapedDest}'`);
} catch (e) {
  console.error(`FALHOU: VACUUM INTO: ${e.message ?? e}`);
  await source.$disconnect();
  process.exit(1);
}
await source.$disconnect();

console.log(`backup gerado: ${destPath}`);

// ------------------------------------------------------------- verificação pós-backup
const copy = client(`file:${destPath.replace(/\\/g, '/')}`);

const integrity = await copy.$queryRawUnsafe(`PRAGMA integrity_check`);
const integrityOk = integrity.length === 1 && integrity[0].integrity_check === 'ok';

const [{ count: sentinelAfter }] = await copy.$queryRawUnsafe(
  `SELECT COUNT(*) AS count FROM journal_entries`,
);
await copy.$disconnect();

console.log(`integrity_check: ${integrityOk ? 'ok' : JSON.stringify(integrity)}`);
console.log(`journal_entries: fonte=${sentinelBefore} · cópia=${sentinelAfter}`);

if (!integrityOk) {
  console.error('\nFALHOU: integrity_check da cópia não retornou "ok".');
  process.exit(1);
}
if (Number(sentinelAfter) !== Number(sentinelBefore)) {
  console.error(
    `\nFALHOU: contagem de journal_entries não bate (fonte=${sentinelBefore}, cópia=${sentinelAfter}).`,
  );
  process.exit(1);
}

console.log(`\nOK: backup íntegro em ${destPath}.`);
