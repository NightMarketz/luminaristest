// Smoke-migration-gate — BE-INCR-MONEY-BIGINT (F2/F-W2B-1): 13 `*Cents` columns / 11 models,
// Int -> BigInt, via RedefineTables (SQLite has no ALTER COLUMN TYPE).
//
// Different shape from the additive gates (INCR-9) and the data-migration gates (COUNTERPARTY-
// NOTNULL): this is a WIDTH-ONLY type change on EXISTING columns, so the S6 discipline applies in
// full — every pre-existing VALUE (not just row count) must survive byte-identical. RedefineTables
// rebuilds each table (CREATE new_<table> -> INSERT SELECT -> DROP -> RENAME), so the checks below
// prove three separate things a naive "row count matches" check would miss:
//   V1  no row is lost or gained, per table (11 tables touched).
//   V2  every existing `*Cents` value round-trips EXACT — a per-row fingerprint (id + every
//       `*Cents` column) taken BEFORE and AFTER must match, not just an aggregate SUM (which could
//       hide a canceling-out corruption, +1 on one row and -1 on another).
//   V3  a value ABOVE the old Int32 ceiling (2_147_483_647), which the OLD schema would have
//       rejected/poisoned (ACC-INCR6-J-001), now WRITES and READS back exact on the migrated copy —
//       the actual behavior change this migration exists to deliver.
// V4 proves the ORIGINAL file was never touched (md5+mtime+size before/after).
//
// USAGE (from server/):
//   node --experimental-sqlite scripts/smoke-gate-w2b-bigint-cents.mjs <dev.db> [--keep] [--self-test]
// ex.:
//   node --experimental-sqlite scripts/smoke-gate-w2b-bigint-cents.mjs ../server/prisma/prisma/dev.db
//
// --self-test  corrupts the AFTER snapshot and requires V2 to FAIL — an assertion that never fires
//              is decorative; without this a 10/10 is compatible with a check that looks at nothing.
// --keep       keeps the working copy instead of deleting it at the end (for post-mortem).
//
// Requer Node >= 22.5 (node:sqlite). NUNCA toca o dev.db original — trabalha sobre `<db>.smoke-w2b.db`.

import { DatabaseSync } from 'node:sqlite';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const realDb = args.find((a) => !a.startsWith('--'));
const KEEP = args.includes('--keep');
const SELF_TEST = args.includes('--self-test');

if (!realDb) {
  console.error('ERRO: passe o caminho do dev.db real.\n  node --experimental-sqlite scripts/smoke-gate-w2b-bigint-cents.mjs <dev.db> [--keep] [--self-test]');
  process.exit(2);
}
if (!existsSync(realDb)) { console.error(`ERRO: não existe: ${realDb}`); process.exit(2); }
if (statSync(realDb).size === 0) {
  console.error(`ERRO: ${realDb} tem 0 bytes — é a isca. O dev.db populado é o ANINHADO (server/prisma/prisma/dev.db).`);
  process.exit(2);
}

// ── V4 prep: fingerprint the ORIGINAL file before touching anything ───────────────────────────
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');
const origBefore = { md5: md5(realDb), mtime: statSync(realDb).mtimeMs, size: statSync(realDb).size };

const copy = `${realDb}.smoke-w2b.db`;
for (const suf of ['', '-wal', '-shm', '-journal']) rmSync(`${copy}${suf}`, { force: true });
copyFileSync(realDb, copy);
console.log(`[smoke-gate W2B-BIGINT-CENTS] cópia: ${copy}\n`);

// Tables/columns touched by this migration (13 columns / 11 models, F-W2B-1 "tudo de uma vez").
const TABLES = [
  { table: 'postings', cols: ['debitCents', 'creditCents'] },
  { table: 'bank_statements', cols: ['openingBalanceCents', 'closingBalanceCents'] },
  { table: 'bank_statement_lines', cols: ['amountCents'] },
  { table: 'customer_package_balances', cols: ['balanceCents'] },
  { table: 'package_balance_movements', cols: ['deltaCents'] },
  { table: 'payables', cols: ['amountCents'] },
  { table: 'payable_payments', cols: ['amountCents'] },
  { table: 'receivables', cols: ['amountCents'] },
  { table: 'receivable_receipts', cols: ['amountCents'] },
  { table: 'inventory_items', cols: ['totalValueCents'] },
  { table: 'stock_movements', cols: ['valueCentsDelta'] },
];

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

function snapshot(db) {
  const snap = {};
  for (const { table, cols } of TABLES) {
    const tblExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
    if (!tblExists) { snap[table] = null; continue; }
    const count = db.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get().n;
    const rows = db.prepare(`SELECT id, ${cols.map((c) => `"${c}"`).join(', ')} FROM "${table}" ORDER BY id`).all();
    const canonical = JSON.stringify(
      rows.map((r) => ({
        id: r.id,
        ...Object.fromEntries(cols.map((c) => [c, r[c] === null ? null : String(r[c])])),
      })),
    );
    snap[table] = { count: Number(count), fingerprint: createHash('sha256').update(canonical).digest('hex') };
  }
  return snap;
}

// ── V1/V2 prep: snapshot BEFORE ────────────────────────────────────────────────────────────────
const dbBefore = new DatabaseSync(copy);
for (const { table } of TABLES) {
  const tblExists = dbBefore.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
  if (!tblExists) { console.error(`ERRO: a cópia não tem "${table}" — não parece o dev.db do accounting.`); process.exit(2); }
}
const before = snapshot(dbBefore);
console.log('BEFORE (per-table row count):');
for (const { table } of TABLES) console.log(`  ${table}: ${before[table].count}`);
dbBefore.close();

// ── apply the migration (prisma migrate deploy — same mechanism `deploy:migrate` uses in prod) ──
console.log('\napplying migration (prisma migrate deploy)...');
execSync(`npx prisma migrate deploy`, {
  cwd: SERVER,
  env: { ...process.env, DATABASE_URL: `file:${copy}` },
  stdio: 'pipe',
});
console.log('migration applied.\n');

// ── V1/V2: snapshot AFTER, compare ────────────────────────────────────────────────────────────
const dbAfter = new DatabaseSync(copy);
let after = snapshot(dbAfter);
let corruptedTable = null;

if (SELF_TEST) {
  // Corrupt one row's cents value in the migrated copy — V2 below MUST catch this, and ONLY this
  // table's check — every OTHER table (most are empty in the real dev.db) must still match, so the
  // self-test's own bar has to be "the corrupted table diverges", not "everything diverges".
  const seedTable = TABLES.find((t) => before[t.table].count > 0) ?? TABLES[0];
  corruptedTable = seedTable.table;
  dbAfter
    .prepare(`UPDATE "${seedTable.table}" SET "${seedTable.cols[0]}" = "${seedTable.cols[0]}" + 1 WHERE id = (SELECT id FROM "${seedTable.table}" ORDER BY id LIMIT 1)`)
    .run();
  after = snapshot(dbAfter);
  console.log(`[--self-test] corrompido 1 linha de "${seedTable.table}"."${seedTable.cols[0]}" — V2 deve reprovar SÓ essa tabela abaixo.\n`);
}

console.log('AFTER (per-table row count):');
for (const { table } of TABLES) console.log(`  ${table}: ${after[table].count}`);
console.log();

for (const { table } of TABLES) {
  check(`V1 row count preserved — ${table}`, before[table].count === after[table].count,
    `antes=${before[table].count} depois=${after[table].count}`);
}
for (const { table } of TABLES) {
  const match = before[table].fingerprint === after[table].fingerprint;
  const expectMismatch = SELF_TEST && table === corruptedTable;
  check(`V2 per-row *Cents value round-trip exact — ${table}`, expectMismatch ? !match : match,
    expectMismatch
      ? '(--self-test: esperava DIVERGÊNCIA nesta tabela e ela apareceu)'
      : `fingerprint ${match ? 'idêntico' : 'DIVERGIU'}`);
}

// ── V3: a value ABOVE the old Int32 ceiling now writes/reads back exact on the migrated copy ───
const scope = dbAfter.prepare(`SELECT "userId", "unitId" FROM "accounts" LIMIT 1`).get();
if (!scope) {
  check('V3 valor acima do antigo teto Int32 posta e lê de volta exato', false, 'sem nenhuma account no banco — sem escopo real para semear');
} else {
  const entry = dbAfter.prepare(`SELECT id FROM "journal_entries" WHERE "userId" = ? AND "unitId" = ? LIMIT 1`).get(scope.userId, scope.unitId);
  const account = dbAfter.prepare(`SELECT id FROM "accounts" WHERE "userId" = ? AND "unitId" = ? LIMIT 1`).get(scope.userId, scope.unitId);
  if (!entry || !account) {
    check('V3 valor acima do antigo teto Int32 posta e lê de volta exato', false, 'sem journal_entry/account para ancorar a perna sintética');
  } else {
    const THIRTY_MILLION_REAIS_CENTS = 3_000_000_000n; // R$ 30M — > 2_147_483_647 (old Int32 max)
    const probeId = 'smoke-w2b-probe-30m';
    dbAfter.prepare(`DELETE FROM "postings" WHERE id = ?`).run(probeId);
    dbAfter
      .prepare(
        `INSERT INTO "postings" ("id","userId","unitId","entryId","accountId","debitCents","creditCents","createdAt") VALUES (?,?,?,?,?,?,0,?)`,
      )
      .run(probeId, scope.userId, scope.unitId, entry.id, account.id, THIRTY_MILLION_REAIS_CENTS, Date.now());
    const reread = dbAfter.prepare(`SELECT "debitCents" FROM "postings" WHERE id = ?`).get(probeId);
    const exact = BigInt(reread.debitCents) === THIRTY_MILLION_REAIS_CENTS;
    check('V3 valor acima do antigo teto Int32 (R$30M) posta e lê de volta exato', exact,
      `esperado=${THIRTY_MILLION_REAIS_CENTS} lido=${reread.debitCents}`);
    dbAfter.prepare(`DELETE FROM "postings" WHERE id = ?`).run(probeId); // não deixa resíduo na cópia
  }
}
dbAfter.close();

// ── V4: the ORIGINAL file was never touched ─────────────────────────────────────────────────────
const origAfter = { md5: md5(realDb), mtime: statSync(realDb).mtimeMs, size: statSync(realDb).size };
check('V4 dev.db ORIGINAL intocado (md5)', origBefore.md5 === origAfter.md5, `${origBefore.md5} -> ${origAfter.md5}`);
check('V4 dev.db ORIGINAL intocado (mtime)', origBefore.mtime === origAfter.mtime, `${origBefore.mtime} -> ${origAfter.mtime}`);
check('V4 dev.db ORIGINAL intocado (size)', origBefore.size === origAfter.size, `${origBefore.size} -> ${origAfter.size}`);

if (!KEEP) { for (const suf of ['', '-wal', '-shm', '-journal']) rmSync(`${copy}${suf}`, { force: true }); }

const failed = results.filter((r) => !r.pass);
console.log(`\n${failed.length === 0 ? 'PASS' : 'FAIL'} — ${results.length - failed.length}/${results.length} checks green.`);
if (failed.length > 0) {
  console.log('Falhas:', failed.map((f) => f.name).join('; '));
  process.exit(1);
}
