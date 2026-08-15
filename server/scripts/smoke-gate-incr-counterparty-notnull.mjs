// Smoke-migration-gate — BE-INCR-COUNTERPARTY-NOTNULL (SEC-A1-5).
//
// POR QUE ESTE GATE EXISTE (e não é o `scripts/smoke-migration-gate.mjs` genérico):
// o genérico exige que TODA coluna pré-existente sobreviva byte-a-byte (S6). Esta é uma migração DE
// DADO — o backfill move `counterpartyId` de NULL para um id, de propósito —, então S6 reprova por
// desenho e não tem como distinguir "mudou porque quebrou" de "mudou porque era o objetivo". A
// asserção correta é a daqui: *tudo menos `counterpartyId` é byte-idêntico, e `counterpartyId` só sai
// de NULL para uma contraparte do PRÓPRIO escopo*. Irmão de
// `smoke-gate-incr-counterparty.mjs` (A1) e `smoke-gate-incr-dim-completeness.mjs` (B1) — mesma forma.
//
// POR QUE ELE SEMEIA: o `dev.db` real tem payables/receivables VAZIAS (medido). Sem semear, S5/V2
// passariam por vacuidade — a armadilha documentada no relatório INCR-INVENTORY. O gate planta os
// cantos do backfill na CÓPIA e nunca toca o original. Linhas reais de AP/AR, quando existirem,
// entram na verificação junto com as semeadas.
//
// USO (a partir de server/):
//   node --experimental-sqlite scripts/smoke-gate-incr-counterparty-notnull.mjs <dev.db> [--keep] [--self-test]
// ex.:
//   node --experimental-sqlite scripts/smoke-gate-incr-counterparty-notnull.mjs ../server/prisma/prisma/dev.db --self-test
//
// --self-test  adultera o snapshot PRÉ e exige que V1 REPROVE. Uma asserção que nunca dispara é
//              decorativa; sem isto, um 10/10 é compatível com uma verificação que não olha nada.
//
// Requer Node >= 22.5 (node:sqlite). NUNCA toca o dev.db original — trabalha sobre `<db>.smoke-notnull.db`.

import { DatabaseSync } from 'node:sqlite';
import { copyFileSync, existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION = join(SERVER, 'prisma', 'migrations', '20260814120000_counterparty_notnull', 'migration.sql');

const args = process.argv.slice(2);
const realDb = args.find((a) => !a.startsWith('--'));
const KEEP = args.includes('--keep');
const SELF_TEST = args.includes('--self-test');

if (!realDb) {
  console.error('ERRO: passe o caminho do dev.db real.\n  node --experimental-sqlite scripts/smoke-gate-incr-counterparty-notnull.mjs <dev.db> [--keep] [--self-test]');
  process.exit(2);
}
if (!existsSync(realDb)) { console.error(`ERRO: não existe: ${realDb}`); process.exit(2); }
if (statSync(realDb).size === 0) {
  console.error(`ERRO: ${realDb} tem 0 bytes — é a isca. O dev.db populado é o ANINHADO (server/prisma/prisma/dev.db).`);
  process.exit(2);
}
if (!existsSync(MIGRATION)) { console.error(`ERRO: migração não encontrada: ${MIGRATION}`); process.exit(2); }

// A migração vem do DISCO, não espelhada aqui: um espelho diverge da fonte em silêncio.
const migrationSql = readFileSync(MIGRATION, 'utf8');

const copy = `${realDb}.smoke-notnull.db`;
for (const suf of ['', '-wal', '-shm']) rmSync(`${copy}${suf}`, { force: true });
copyFileSync(realDb, copy);
console.log(`[smoke-gate INCR-COUNTERPARTY-NOTNULL] cópia: ${copy}\n`);

const db = new DatabaseSync(copy);
const one = (sql, ...p) => db.prepare(sql).get(...p);
const all = (sql, ...p) => db.prepare(sql).all(...p);
const n = (sql, ...p) => Number(one(sql, ...p).n);

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const tbl = (t) => one(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, t);
for (const t of ['payables', 'receivables', 'counterparties']) {
  if (!tbl(t)) { console.error(`ERRO: a cópia não tem "${t}" — este não parece o dev.db do accounting (ou a 1ª migração A1 não foi aplicada).`); process.exit(2); }
}

// ───────────────────────────────────────────────────────────────────── semeadura dos cantos
// Escopo DERIVADO do próprio banco (nunca hardcoded): o gate tem de rodar no dev.db de qualquer um.
const escopo = one(`SELECT "userId", "unitId", "id" AS "accountId" FROM "accounts" ORDER BY "id" LIMIT 1`);
if (!escopo) { console.error('ERRO: o banco não tem nenhuma account — sem escopo real para semear.'); process.exit(2); }
const { userId: USER, unitId: UNIT_A, accountId: ACC_A } = escopo;
// 2ª unidade para o controle de V6. Se não houver outra, uma unitId sintética serve: o payable
// semeado nela leva expenseAccountId NULL (a coluna é nullable desde o INCR-INVENTORY), sem FK a satisfazer.
const outra = one(`SELECT DISTINCT "unitId" FROM "accounts" WHERE "userId"=? AND "unitId"<>? LIMIT 1`, USER, UNIT_A);
const UNIT_B = outra ? outra.unitId : `${UNIT_A}-smoke-b`;

const MS_EMISSAO = Date.UTC(2026, 5, 10);
const MS_VENC = Date.UTC(2026, 6, 10);
const MS_AGORA = Date.UTC(2026, 7, 14);

const realPay = n('SELECT COUNT(*) n FROM "payables"');
const realRec = n('SELECT COUNT(*) n FROM "receivables"');

const semearPayable = (id, unitId, expAcc, supplierName, doc, counterpartyId, status = 'OPEN', deletedAt = null) =>
  db.prepare(
    `INSERT INTO "payables" ("id","userId","unitId","supplierName","supplierRef","documentNumber","description","issueDate","dueDate","amountCents","expenseAccountId","inventoryProductRef","inventoryQty","counterpartyId","status","createdById","cancelledById","cancelReason","createdAt","updatedAt","deletedAt")
     VALUES (?,?,?,?,NULL,?,'smoke-notnull',?,?,150000,?,NULL,NULL,?,?,NULL,NULL,NULL,?,?,?)`,
  ).run(id, USER, unitId, supplierName, doc, MS_EMISSAO, MS_VENC, expAcc, counterpartyId, status, MS_AGORA, MS_AGORA, deletedAt);

// Contraparte PRÉ-EXISTENTE — o vínculo dela não pode ser re-cunhado (V4).
db.prepare(
  `INSERT INTO "counterparties" ("id","userId","unitId","type","name","ref","createdById","createdAt","updatedAt","deletedAt")
   VALUES ('smokeb_cp_pre',?,?,'SUPPLIER','SMOKE FORNECEDOR PRE',NULL,NULL,?,?,NULL)`,
).run(USER, UNIT_A, MS_AGORA, MS_AGORA);

semearPayable('smokeb_pay_ligado', UNIT_A, ACC_A, 'SMOKE FORNECEDOR PRE', 'NF-SMOKE-PRE', 'smokeb_cp_pre');
semearPayable('smokeb_pay_orfao', UNIT_A, ACC_A, 'SMOKE ORFAO LTDA', 'NF-SMOKE-ORF1', null);
// Cancelado + soft-deleted, MESMO nome: histórico entra no backfill e não pode gerar 2ª contraparte (V5).
semearPayable('smokeb_pay_orfao_morto', UNIT_A, ACC_A, 'SMOKE ORFAO LTDA', 'deleted:smokeb_pay_orfao_morto:NF-SMOKE-ORF2', null, 'CANCELLED', MS_AGORA);
// MESMA razão social em OUTRA unidade: sem esta linha, V6 (zero cross-escopo) passa por vacuidade.
semearPayable('smokeb_pay_outra_unidade', UNIT_B, null, 'SMOKE ORFAO LTDA', 'NF-SMOKE-ORF1', null);

db.prepare(
  `INSERT INTO "receivables" ("id","userId","unitId","customerName","customerRef","documentNumber","description","issueDate","dueDate","amountCents","revenueAccountId","counterpartyId","status","createdById","cancelledById","cancelReason","createdAt","updatedAt","deletedAt")
   VALUES ('smokeb_rec_orfao',?,?,'SMOKE CLIENTE ORFAO',NULL,'FAT-SMOKE-ORF1','smoke-notnull',?,?,90000,?,NULL,'OPEN',NULL,NULL,NULL,?,?,NULL)`,
).run(USER, UNIT_A, MS_EMISSAO, MS_VENC, ACC_A, MS_AGORA, MS_AGORA);

console.log(`  semeadura: escopo ${USER}/${UNIT_A} (2ª unidade: ${UNIT_B}${outra ? '' : ', sintética'})`);
console.log(`  baseline: payables ${realPay} reais + 4 semeados · receivables ${realRec} reais + 1 semeado\n`);

// ───────────────────────────────────────────────────────────────────── snapshot PRÉ
const colsDe = (t) => all(`PRAGMA table_info("${t}")`).map((c) => c.name);
const idxDe = (t) => all(`PRAGMA index_list("${t}")`).map((i) => i.name).filter((x) => !x.startsWith('sqlite_autoindex')).sort();
const linhasDe = (t, cols) => all(`SELECT ${cols.map((c) => `"${c}"`).join(',')} FROM "${t}" ORDER BY "id"`);

const pre = {};
for (const t of ['payables', 'receivables']) {
  const cols = colsDe(t);
  pre[t] = { cols, rows: linhasDe(t, cols), indexes: idxDe(t) };
}

// ───────────────────────────────────────────────────────────────────── aplica a migração
try {
  db.exec(migrationSql);
} catch (e) {
  console.error(`\nERRO ao aplicar a migração: ${e.message}`);
  console.error('  (um ABORT de SEC-A1-5 aqui é o gate funcionando: alguma linha ficou sem contraparte)');
  process.exit(1);
}

// ───────────────────────────────────────────────────────────────────── V1..V10
/** V1: toda coluna EXCETO counterpartyId byte-idêntica. Devolve a lista de divergências. */
const difsContra = (snapshot) => {
  const difs = [];
  for (const t of ['payables', 'receivables']) {
    const post = linhasDe(t, snapshot[t].cols);
    for (let i = 0; i < snapshot[t].rows.length; i++) {
      const a = snapshot[t].rows[i];
      const b = post[i];
      if (!b || a.id !== b.id) { difs.push(`${t}[${i}] linha sumiu ou reordenou`); continue; }
      for (const c of snapshot[t].cols) {
        if (c === 'counterpartyId') continue; // a ÚNICA coluna com licença para mudar
        if (String(a[c]) !== String(b[c])) difs.push(`${t}.${a.id}.${c}: ${a[c]} -> ${b[c]}`);
      }
    }
  }
  return difs;
};

const difs = difsContra(pre);
check('V1. demais colunas byte-idênticas (só counterpartyId muda)', difs.length === 0, difs.slice(0, 3).join(' | '));

const posPay = n('SELECT COUNT(*) n FROM "payables"');
const posRec = n('SELECT COUNT(*) n FROM "receivables"');
check('V2. contagem preservada', posPay === realPay + 4 && posRec === realRec + 1, `AP ${realPay + 4}→${posPay}, AR ${realRec + 1}→${posRec}`);

const nullPay = n('SELECT COUNT(*) n FROM "payables" WHERE "counterpartyId" IS NULL');
const nullRec = n('SELECT COUNT(*) n FROM "receivables" WHERE "counterpartyId" IS NULL');
check('V3. zero counterpartyId NULL após a migração', nullPay === 0 && nullRec === 0, `AP=${nullPay} AR=${nullRec}`);

const ligado = one(`SELECT "counterpartyId" FROM "payables" WHERE "id"='smokeb_pay_ligado'`);
check('V4. vínculo pré-existente intacto (não re-cunhado)', ligado?.counterpartyId === 'smokeb_cp_pre', `counterpartyId=${ligado?.counterpartyId}`);

const vivo = one(`SELECT "counterpartyId" FROM "payables" WHERE "id"='smokeb_pay_orfao'`);
const morto = one(`SELECT "counterpartyId" FROM "payables" WHERE "id"='smokeb_pay_orfao_morto'`);
check('V5. órfão vivo e cancelado de mesmo nome compartilham UMA contraparte',
  !!vivo?.counterpartyId && vivo.counterpartyId === morto?.counterpartyId, `${vivo?.counterpartyId} vs ${morto?.counterpartyId}`);

const xPay = n('SELECT COUNT(*) n FROM "payables" p JOIN "counterparties" c ON p."counterpartyId"=c."id" WHERE p."userId"<>c."userId" OR p."unitId"<>c."unitId"');
const xRec = n('SELECT COUNT(*) n FROM "receivables" r JOIN "counterparties" c ON r."counterpartyId"=c."id" WHERE r."userId"<>c."userId" OR r."unitId"<>c."unitId"');
const naOutra = one(`SELECT "counterpartyId" FROM "payables" WHERE "id"='smokeb_pay_outra_unidade'`);
const duasIdentidades = !!naOutra?.counterpartyId && naOutra.counterpartyId !== vivo?.counterpartyId;
check('V6. zero vínculo cross-escopo (SEC-A1-3) + mesmo nome em 2 unidades = 2 contrapartes',
  xPay === 0 && xRec === 0 && duasIdentidades, `cross AP=${xPay} AR=${xRec} · identidades distintas=${duasIdentidades}`);

let rejeitou = false;
try {
  db.exec(`INSERT INTO "payables" ("id","userId","unitId","supplierName","description","issueDate","dueDate","amountCents","counterpartyId","status","createdAt","updatedAt") VALUES ('smokeb_v7_probe','u','unit','X','x',0,0,1,NULL,'OPEN',0,0)`);
} catch (e) {
  rejeitou = /NOT NULL/i.test(e.message);
}
check('V7. NOT NULL valendo — INSERT com counterpartyId NULL rejeitado', rejeitou);

const idxOk = ['payables', 'receivables'].every((t) => pre[t].indexes.every((i) => idxDe(t).includes(i)));
check('V8. índices preservados no rebuild', idxOk, `AP=${idxDe('payables').length} AR=${idxDe('receivables').length}`);

const fkViol = all('PRAGMA foreign_key_check');
check('V9. PRAGMA foreign_key_check sem violações', fkViol.length === 0, `${fkViol.length} violação(ões)`);

// V10 — a sonda de SEC-A1-5 é temporária; se sobrar, ficou lixo no schema do cliente (o ABORT não
// reverte a migração no SQLite, então a limpeza importa).
check('V10. sonda _sec_a1_5_probe removida', !tbl('_sec_a1_5_probe'));

// ───────────────────────────────────────────────────────────────────── falsificação (--self-test)
if (SELF_TEST) {
  console.log('\n  [--self-test] adulterando o snapshot PRÉ — V1 TEM de reprovar:');
  const adulterado = JSON.parse(JSON.stringify(pre, (_, v) => (typeof v === 'bigint' ? String(v) : v)));
  const alvo = adulterado.payables.rows[0];
  const coluna = adulterado.payables.cols.find((c) => c !== 'counterpartyId' && c !== 'id');
  alvo[coluna] = `${alvo[coluna]}__ADULTERADO`;
  // e mexe no campo ISENTO: V1 tem de continuar cego para ele
  if (adulterado.payables.rows[1]) adulterado.payables.rows[1].counterpartyId = 'cp_inexistente';
  const difsFalsas = difsContra(adulterado);
  const pegou = difsFalsas.some((d) => d.includes(coluna));
  const cegoNoIsento = !difsFalsas.some((d) => d.includes('counterpartyId'));
  check(`V1-falsificação. detecta mudança em "${coluna}" e ignora counterpartyId`, pegou && cegoNoIsento,
    `detectou=${pegou} cego-no-isento=${cegoNoIsento}`);
}

db.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n[smoke-gate INCR-COUNTERPARTY-NOTNULL] ${failed.length === 0 ? 'DEPLOY-CLEARED ✅' : `FAIL ❌ (${failed.length})`}`);
if (realPay === 0 && realRec === 0) {
  console.log('  ⚠  AVISO: o dev.db real não tem AP/AR próprios — as verificações rodaram SÓ sobre as linhas semeadas.');
}
if (KEEP) console.log(`  cópia mantida (--keep): ${copy}`);
else for (const suf of ['', '-wal', '-shm']) rmSync(`${copy}${suf}`, { force: true });
process.exit(failed.length === 0 ? 0 : 1);
