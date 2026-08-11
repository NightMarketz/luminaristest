#!/usr/bin/env node
// smoke-migration-gate — o [PAPEL] vira script.
//
// Automatiza o procedimento comum dos 13 relatórios manuais de docs/accounting/
// SMOKE-MIGRATION-GATE-*.md (a spec deste script): provar que as migrações pendentes
// aplicam sobre uma CÓPIA do dev.db real sem perder linha, índice, FK nem integridade —
// antes de qualquer deploy. Roda LOCAL (o dado real não existe no CI, de propósito).
//
// O QUE ELE GARANTE (FAIL = exit 1):
//   S1  o banco ORIGINAL não foi tocado — md5 idêntico antes/depois de toda a operação
//   S2  `prisma migrate deploy` aplica limpo na cópia
//   S3  `PRAGMA integrity_check` == ok
//   S4  `PRAGMA foreign_key_check` == 0 violações
//   S5  nenhuma tabela PERDE linha (contagem por tabela antes/depois; `_prisma_migrations`
//       excluída — muda por desenho)
//   S6  as COLUNAS QUE JÁ EXISTIAM sobrevivem byte-a-byte — hash por tabela sobre as
//       colunas do snapshot PRÉ (é assim que os relatórios provaram o rebuild do SQLite:
//       coluna nova pode nascer, dado velho não pode mudar)
//   S7  nenhum ÍNDICE nomeado desaparece (rebuild malfeito dropa índice em silêncio —
//       lição literal do relatório INCR-INVENTORY)
//   S8  partida dobrada: nenhum journal_entry com Σdébito ≠ Σcrédito
//
// O QUE ELE AVISA (não reprova):
//   W1  ação de FK mudou (a classe RESTRICT→SET NULL do achado do INCR-INVENTORY —
//       pode ser intencional; o humano lê)
//   W2  GATE VAZIO — as tabelas de contabilidade têm 0 linhas: um PASS aqui é vácuo
//       ("sobreviveu" sem nada a sobreviver — armadilha documentada no INCR-INVENTORY)
//
// LIMITE DECLARADO (o mesmo dos relatórios): prova BANCO, não serviço — não exercita a
// cadeia de camadas nem substitui browser sign-off. E prova as migrações PENDENTES na
// cópia; com 0 pendentes vira um puro gate de integridade do estado atual (útil, mas
// não é prova de migração — o resumo diz qual dos dois aconteceu).
//
// Uso:  node scripts/smoke-migration-gate.mjs [--db <caminho>] [--keep]
//   --db    default: server/prisma/prisma/dev.db (o REAL é o aninhado;
//           server/prisma/dev.db é isca de 0 byte — memória dev-db-real-path-is-nested)
//   --keep  não apaga a cópia ao final (debug)

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SERVER = join(ROOT, 'server');
const require = createRequire(import.meta.url);
const { PrismaClient } = require(join(SERVER, 'generated', 'prisma'));

const args = process.argv.slice(2);
const dbArg = args.includes('--db') ? args[args.indexOf('--db') + 1] : join(SERVER, 'prisma', 'prisma', 'dev.db');
const KEEP = args.includes('--keep');
const ORIGINAL = resolve(dbArg);

const fails = [];
const warns = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);

if (!existsSync(ORIGINAL)) {
  console.error(`FALHOU: banco não existe: ${ORIGINAL}`);
  process.exit(1);
}
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');

// ---------------------------------------------------------------- isolamento
const md5Before = md5(ORIGINAL);
const workDir = mkdtempSync(join(tmpdir(), 'smoke-migration-'));
const COPY = join(workDir, 'copy.db');
copyFileSync(ORIGINAL, COPY);
for (const suf of ['-wal', '-shm']) {
  if (existsSync(ORIGINAL + suf)) copyFileSync(ORIGINAL + suf, COPY + suf);
}
console.log(`original: ${ORIGINAL} (md5 ${md5Before})`);
console.log(`cópia:    ${COPY}`);

const client = (url) => new PrismaClient({ datasources: { db: { url } } });
const url = `file:${COPY.replace(/\\/g, '/')}`;

/** Snapshot: por tabela de usuário — colunas, contagem, hash do conteúdo, índices, FKs. */
async function snapshot(db) {
  const tables = (
    await db.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations' ORDER BY name`,
    )
  ).map((r) => r.name);
  const snap = {};
  for (const t of tables) {
    const cols = (await db.$queryRawUnsafe(`PRAGMA table_info("${t}")`)).map((c) => c.name);
    const rows = await db.$queryRawUnsafe(
      `SELECT ${cols.map((c) => `"${c}"`).join(', ')} FROM "${t}" ORDER BY rowid`,
    );
    const json = JSON.stringify(rows, (_, v) => (typeof v === 'bigint' ? String(v) : v));
    const indexes = (await db.$queryRawUnsafe(`PRAGMA index_list("${t}")`))
      .map((i) => i.name)
      .filter((n) => !n.startsWith('sqlite_autoindex'))
      .sort();
    const fks = (await db.$queryRawUnsafe(`PRAGMA foreign_key_list("${t}")`))
      .map((f) => `${f.from}->${f.table}(${f.to}) on_delete=${f.on_delete}`)
      .sort();
    snap[t] = { cols, count: rows.length, hash: createHash('md5').update(json).digest('hex'), indexes, fks };
  }
  return snap;
}

/** Re-hash de uma tabela usando SÓ as colunas do snapshot PRÉ (S6: dado velho intacto). */
async function hashOldCols(db, table, oldCols) {
  const nowCols = (await db.$queryRawUnsafe(`PRAGMA table_info("${table}")`)).map((c) => c.name);
  const survivors = oldCols.filter((c) => nowCols.includes(c));
  if (survivors.length !== oldCols.length) {
    warn(`W-col: "${table}" perdeu coluna(s): ${oldCols.filter((c) => !nowCols.includes(c)).join(', ')}`);
  }
  const rows = await db.$queryRawUnsafe(
    `SELECT ${survivors.map((c) => `"${c}"`).join(', ')} FROM "${table}" ORDER BY rowid`,
  );
  const json = JSON.stringify(rows, (_, v) => (typeof v === 'bigint' ? String(v) : v));
  return createHash('md5').update(json).digest('hex');
}

let pre;
{
  const db = client(url);
  pre = await snapshot(db);
  await db.$disconnect();
}

// ---------------------------------------------------------------- S2 · migrate
// ponytail: sem `migrate status` — o parse do formato de saída dele já devolveu
// 'desconhecido'; a contagem autoritativa é o output do próprio deploy.
let aplicadas = 0;
try {
  const deployOut = execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: SERVER,
    env: { ...process.env, DATABASE_URL: url },
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: 'pipe',
  });
  // A contagem autoritativa vem do próprio deploy ("Applying migration `x`"), não do parse
  // frágil do `migrate status` — que já devolveu 'desconhecido' num formato de saída novo.
  aplicadas = (deployOut.match(/Applying migration/g) || []).length;
} catch (e) {
  fail(`S2: migrate deploy falhou: ${String(e.stderr || e.stdout || e.message).slice(0, 400)}`);
}
console.log(`migrações aplicadas na cópia: ${aplicadas}`);

// ---------------------------------------------------------------- S3..S8 · pós
{
  const db = client(url);

  const integ = await db.$queryRawUnsafe(`PRAGMA integrity_check`);
  if (!(integ.length === 1 && integ[0].integrity_check === 'ok')) {
    fail(`S3: integrity_check devolveu ${JSON.stringify(integ).slice(0, 200)}`);
  }

  const fkViol = await db.$queryRawUnsafe(`PRAGMA foreign_key_check`);
  if (fkViol.length > 0) fail(`S4: foreign_key_check com ${fkViol.length} violação(ões): ${JSON.stringify(fkViol.slice(0, 3))}`);

  const pos = await snapshot(db);

  for (const [t, before] of Object.entries(pre)) {
    const after = pos[t];
    if (!after) {
      // Tabela pode ser legitimamente dropada por migração — mas nunca com linhas dentro.
      if (before.count > 0) fail(`S5: tabela "${t}" (${before.count} linhas) SUMIU na migração`);
      else warn(`W-drop: tabela vazia "${t}" removida pela migração`);
      continue;
    }
    if (after.count < before.count) fail(`S5: "${t}" perdeu linhas: ${before.count} → ${after.count}`);
    // S6 — byte-a-byte sobre as colunas antigas (o hash cheio muda quando nasce coluna; este não pode).
    const oldColsHash = await hashOldCols(db, t, before.cols);
    if (oldColsHash !== before.hash && after.count === before.count) {
      fail(`S6: "${t}" — conteúdo das colunas pré-existentes MUDOU no rebuild`);
    }
    for (const idx of before.indexes) {
      if (!after.indexes.includes(idx)) fail(`S7: índice "${idx}" de "${t}" desapareceu no rebuild`);
    }
    for (const fk of before.fks) {
      if (!after.fks.includes(fk)) warn(`W1: FK de "${t}" mudou — antes: ${fk}`);
    }
  }

  // S8 — partida dobrada, por lançamento.
  if (pos['postings']) {
    const desb = await db.$queryRawUnsafe(
      `SELECT entryId, SUM(debitCents) AS d, SUM(creditCents) AS c FROM postings GROUP BY entryId HAVING SUM(debitCents) != SUM(creditCents)`,
    );
    if (desb.length > 0) {
      fail(`S8: ${desb.length} lançamento(s) DESBALANCEADO(s): ${JSON.stringify(desb.slice(0, 3), (_, v) => (typeof v === 'bigint' ? String(v) : v))}`);
    }
  }

  // W2 — gate vazio.
  const je = pos['journal_entries']?.count ?? 0;
  if (je === 0) warn(`W2: GATE VAZIO — journal_entries=0; um PASS aqui não prova sobrevivência de dado contábil`);

  console.log(
    `tabelas=${Object.keys(pos).length} · journal_entries=${je} · postings=${pos['postings']?.count ?? 0} · accounts=${pos['accounts']?.count ?? 0} · audit_events=${pos['audit_events']?.count ?? 0}`,
  );
  await db.$disconnect();
}

// ---------------------------------------------------------------- S1 · não-toque
const md5After = md5(ORIGINAL);
if (md5After !== md5Before) fail(`S1: o banco ORIGINAL FOI TOCADO — md5 ${md5Before} → ${md5After}`);

if (!KEEP) rmSync(workDir, { recursive: true, force: true });
else console.log(`cópia mantida (--keep): ${workDir}`);

for (const w of warns) console.warn(`aviso: ${w}`);
if (fails.length) {
  for (const f of fails) console.error(`erro: ${f}`);
  console.error(`\nFALHOU: ${fails.length} erro(s). Migração NÃO está deploy-cleared.`);
  process.exit(1);
}
console.log(
  `\nOK: ${aplicadas === 0 ? 'sem migração pendente — gate rodou como CHECAGEM DE INTEGRIDADE do estado atual' : `${aplicadas} migração(ões) aplicada(s) na cópia sem perda`}. Original intocado (S1).`,
);
