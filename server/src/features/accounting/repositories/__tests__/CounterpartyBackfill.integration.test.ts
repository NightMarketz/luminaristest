/**
 * Integration test: the INCR-COUNTERPARTY / A1 BACKFILL against a REAL SQLite database. No mocks.
 * Proves the two binding security gates of the data migration (the same properties the
 * smoke-migration-gate asserts on a copy of the real dev.db):
 *   • SEC-A1-2  dedupe by SCOPE — one Counterparty per DISTINCT (userId, unitId, name) per type; two
 *               tenants named "ACME" stay TWO rows, never collapse into one.
 *   • SEC-A1-3  zero cross-scope — every backfilled counterpartyId points at a Counterparty of the
 *               row's OWN (userId, unitId).
 *   • idempotent — running the backfill a 2nd time is a no-op (no P2002, counts unchanged).
 *
 * O SQL do backfill é LIDO DO DISCO (migrations/20260715060000_incr_counterparty/migration.sql), não
 * espelhado aqui: um espelho passa a divergir da fonte em silêncio — o teste seguiria verde provando
 * uma cópia que ninguém executa. Mesma técnica do gate irmão `smoke-gate-incr-counterparty.mjs`, que
 * fatia a migração no marcador `-- SUPPLIERS from payables`.
 *
 * As linhas de subrazão são semeadas por SQL cru, não pelo Prisma Client: o client é gerado do schema
 * FINAL, onde `counterpartyId` é NOT NULL (SEC-A1-5), então `db.payable.create` exige a FK e não
 * consegue mais encenar o estado pré-backfill. Datas em INTEGER ms-epoch — a forma real de escrita.
 */
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { PrismaClient } from 'generated/prisma';

const SERVER_ROOT = path.join(__dirname, '../../../../../');

/**
 * A migração que endurece `counterpartyId` para NOT NULL (SEC-A1-5). Omitida ao montar o banco deste
 * teste: com ela aplicada, o estado PRÉ-backfill que aqui se encena — linha de subrazão com contraparte
 * nula — deixa de ser representável. Cortar antes dela por data não serve: migrações posteriores
 * (`requiresDimension`, p. ex.) trazem colunas que o Prisma Client atual exige.
 */
const NOTNULL_MIGRATION = '20260814120000_counterparty_notnull';

/**
 * BRIEF-W2-A — a migração que adiciona `nameNormalized` NOT NULL a `counterparties`. TAMBÉM omitida,
 * pelo MESMO motivo do NOTNULL_MIGRATION acima: o INSERT do backfill lido de `BACKFILL_MIGRATION`
 * (20260715060000) grava só as 10 colunas que existiam NAQUELE momento — sem `nameNormalized`. Se esta
 * migração já tivesse rodado, `counterparties` exigiria a coluna, e o `INSERT OR IGNORE` do backfill
 * antigo faria o INSERT ser silenciosamente descartado pela violação de NOT NULL (SQLite: `OR IGNORE`
 * engole NOT NULL igual a UNIQUE) — o teste passaria vácuo (0 linhas), não vermelho, escondendo a causa.
 * A migração desta fase tem cobertura PRÓPRIA em `CounterpartyIdentityNormalization.integration.test.ts`.
 */
const W2A_MIGRATION = '20260830160349_counterparty_identity_normalization';

/** A migração de onde o backfill é lido, e o marcador onde ela começa (mesmo do gate irmão). */
const BACKFILL_MIGRATION = '20260715060000_incr_counterparty';
const BACKFILL_MARKER = '-- SUPPLIERS from payables';
/** INSERT fornecedores · LINK payables · INSERT clientes · LINK receivables. */
const BACKFILL_STATEMENTS = 4;

/**
 * Fatia o backfill da migração REAL. Se o marcador sumir (migração reescrita), falha alto aqui em vez
 * de rodar meio backfill e reprovar mais adiante por um motivo obscuro.
 */
function readBackfillStatements(): string[] {
  const file = path.join(SERVER_ROOT, 'prisma', 'migrations', BACKFILL_MIGRATION, 'migration.sql');
  const sql = fs.readFileSync(file, 'utf8');
  const start = sql.indexOf(BACKFILL_MARKER);
  if (start === -1) {
    throw new Error(`marcador "${BACKFILL_MARKER}" não existe em ${file} — este teste perdeu a fonte do backfill`);
  }
  return sql
    .slice(start)
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.replace(/--[^\n]*/g, '').trim().length > 0);
}

async function runBackfill(db: PrismaClient, statements: string[]): Promise<void> {
  for (const stmt of statements) await db.$executeRawUnsafe(stmt);
}

describe('INCR-COUNTERPARTY backfill — real SQLite DB (SEC-A1-2 / SEC-A1-3)', () => {
  let db: PrismaClient;
  let dbPath: string;
  let backfill: string[];

  beforeAll(async () => {
    dbPath = path.join(os.tmpdir(), `cp-backfill-${Date.now()}.db`);
    // Monta o schema arquivo a arquivo, OMITINDO só a migração de NOT NULL (ver NOTNULL_MIGRATION).
    // `prisma migrate deploy` aplicaria todas e tornaria este teste impossível de montar.
    const migrationsDir = path.join(SERVER_ROOT, 'prisma', 'migrations');
    const todas = fs
      .readdirSync(migrationsDir)
      .filter((d) => fs.existsSync(path.join(migrationsDir, d, 'migration.sql')))
      .sort();
    const aplicar = todas.filter((d) => d !== NOTNULL_MIGRATION && d !== W2A_MIGRATION);
    // Controle do harness: exatamente DUAS migrações foram omitidas, e são as que se pretendia omitir.
    // Sem isto, um rename do diretório passaria a aplicar TUDO (o teste quebraria por motivo obscuro)
    // ou a omitir demais.
    expect(todas).toContain(NOTNULL_MIGRATION);
    expect(todas).toContain(W2A_MIGRATION);
    expect(todas.length - aplicar.length).toBe(2);
    // Controle do harness, irmão do de cima: o backfill vem da migração real e tem de chegar inteiro.
    // Sem isto, um `;` a mais num comentário partiria um statement e o teste provaria meio backfill.
    backfill = readBackfillStatements();
    expect(backfill).toHaveLength(BACKFILL_STATEMENTS);
    for (const dir of aplicar) {
      execSync(
        `npx prisma db execute --file "${path.join(migrationsDir, dir, 'migration.sql')}" --url "file:${dbPath}"`,
        { cwd: SERVER_ROOT, env: { ...process.env }, stdio: 'pipe' },
      );
    }
    db = new PrismaClient({
      datasources: { db: { url: `file:${dbPath}?socket_timeout=60&connection_limit=1` } },
    });

    // Two DISTINCT tenants, both with a supplier "ACME" (the collision SEC-A1-2 must NOT collapse).
    for (const u of ['u-A', 'u-B']) {
      await db.user.create({
        data: { id: u, name: u, username: u, email: `${u}@test.local`, password: 'x', role: 'USER' },
      });
      await db.account.create({
        data: { id: `exp-${u}`, userId: u, unitId: 'unit-1', code: '4.1', name: 'Despesas', nature: 'Expense', acceptsEntries: true },
      });
      await db.account.create({
        data: { id: `rev-${u}`, userId: u, unitId: 'unit-1', code: '3.1', name: 'Receita', nature: 'Revenue', acceptsEntries: true },
      });
    }

    // As linhas de subrazão são semeadas por SQL, não pelo Prisma Client: o client é gerado do schema
    // FINAL, onde `counterpartyId` é NOT NULL (SEC-A1-5), então `db.payable.create` passou a exigir a
    // FK e não consegue mais encenar o estado pré-backfill. Datas em INTEGER ms-epoch — a mesma forma
    // que o Prisma grava DateTime no SQLite (memória sintetico-nao-cobre-formato-de-dado-real); o
    // backfill só lê userId/unitId/supplierName (TEXT), então nada aqui depende do encoding de data.
    const MS = new Date('2026-06-10T00:00:00.000Z').getTime();
    const MS_VENC = new Date('2026-07-10T00:00:00.000Z').getTime();
    const seedPayable = (id: string, userId: string, supplierName: string, documentNumber: string, over: { status?: string; deletedAt?: number } = {}) =>
      db.$executeRawUnsafe(
        `INSERT INTO "payables" ("id","userId","unitId","supplierName","supplierRef","documentNumber","description","issueDate","dueDate","amountCents","expenseAccountId","inventoryProductRef","inventoryQty","counterpartyId","status","createdById","cancelledById","cancelReason","createdAt","updatedAt","deletedAt")
         VALUES (?,?,'unit-1',?,NULL,?,'x',?,?,1000,?,NULL,NULL,NULL,?,NULL,NULL,NULL,?,?,?)`,
        id, userId, supplierName, documentNumber, MS, MS_VENC, `exp-${userId}`, over.status ?? 'OPEN', MS, MS, over.deletedAt ?? null,
      );
    // Tenant A: two "ACME" payables (dedupe within scope → 1 CP) + one "Beta" + one CANCELLED "ACME"
    // (soft-deleted rows must still backfill — supplierName is never mangled by rename-on-delete).
    await seedPayable('p-a1', 'u-A', 'ACME', 'NF-1');
    await seedPayable('p-a2', 'u-A', 'ACME', 'NF-2');
    await seedPayable('p-a3', 'u-A', 'Beta', 'NF-3');
    await seedPayable('p-a4', 'u-A', 'ACME', 'deleted:p-a4:NF-4', { status: 'CANCELLED', deletedAt: MS });
    // Tenant B: one "ACME" payable (SAME name, DIFFERENT tenant → must be its own CP).
    await seedPayable('p-b1', 'u-B', 'ACME', 'NF-1');

    // Receivables: tenant A has two "Cliente X" receivables (dedupe → 1 CP).
    const seedReceivable = (id: string, userId: string, customerName: string, documentNumber: string) =>
      db.$executeRawUnsafe(
        `INSERT INTO "receivables" ("id","userId","unitId","customerName","customerRef","documentNumber","description","issueDate","dueDate","amountCents","revenueAccountId","counterpartyId","status","createdById","cancelledById","cancelReason","createdAt","updatedAt","deletedAt")
         VALUES (?,?,'unit-1',?,NULL,?,'x',?,?,1000,?,NULL,'OPEN',NULL,NULL,NULL,?,?,NULL)`,
        id, userId, customerName, documentNumber, MS, MS_VENC, `rev-${userId}`, MS, MS,
      );
    await seedReceivable('r-a1', 'u-A', 'Cliente X', 'FAT-1');
    await seedReceivable('r-a2', 'u-A', 'Cliente X', 'FAT-2');
    await seedReceivable('r-b1', 'u-B', 'Cliente X', 'FAT-1');

    await runBackfill(db, backfill);
    // 60s era margem zero: o beforeAll spawna um `npx prisma db execute` POR migração. Medido em duas
    // execuções seguidas da MESMA suíte: com npx frio estourou o timeout (suíte 78,9s), com cache
    // quente passou (suíte 62,2s). Flake de ambiente, não de lógica — daí a folga.
  }, 180000);

  afterAll(async () => {
    await db?.$disconnect();
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      try { fs.unlinkSync(`${dbPath}${suffix}`); } catch { /* ignore */ }
    }
  });

  // BRIEF-W2-A: este dev.db omite (propositalmente, ver W2A_MIGRATION acima) a migração que adiciona
  // `nameNormalized` a `counterparties` — a tabela real, nesta suíte, genuinamente NÃO tem essa coluna.
  // O Prisma Client TIPADO é gerado do schema FINAL (que já a exige) e projeta TODAS as colunas do
  // model numa query normal — `db.counterparty.findMany/count` e qualquer `include: { counterparty }`
  // quebrariam com "column does not exist", não por bug, mas por descompasso client×schema-do-teste.
  // Por isso as asserções abaixo usam `$queryRawUnsafe`, como o guard cross-scope já fazia.

  it('SEC-A1-2: dedupes SUPPLIERS by (userId, unitId, name) — two tenants "ACME" stay two rows', async () => {
    const acme = await db.$queryRawUnsafe<{ id: string; userId: string }[]>(
      `SELECT "id", "userId" FROM "counterparties" WHERE "type" = 'SUPPLIER' AND "name" = 'ACME'`,
    );
    expect(acme).toHaveLength(2); // one for u-A, one for u-B — NOT collapsed
    expect(new Set(acme.map((c) => c.userId))).toEqual(new Set(['u-A', 'u-B']));

    // Within u-A the two "ACME" payables (+ the cancelled one) share ONE counterparty.
    const aAcme = await db.$queryRawUnsafe<{ n: number }[]>(
      `SELECT COUNT(*) AS n FROM "counterparties" WHERE "userId" = 'u-A' AND "type" = 'SUPPLIER' AND "name" = 'ACME'`,
    );
    expect(Number(aAcme[0].n)).toBe(1);
    const aTotal = await db.$queryRawUnsafe<{ n: number }[]>(
      `SELECT COUNT(*) AS n FROM "counterparties" WHERE "userId" = 'u-A' AND "type" = 'SUPPLIER'`,
    );
    expect(Number(aTotal[0].n)).toBe(2); // ACME + Beta
  });

  it('SEC-A1-2: dedupes CUSTOMERS by scope too', async () => {
    const x = await db.$queryRawUnsafe<{ id: string }[]>(
      `SELECT "id" FROM "counterparties" WHERE "type" = 'CUSTOMER' AND "name" = 'Cliente X'`,
    );
    expect(x).toHaveLength(2); // u-A + u-B
  });

  it('SEC-A1-3: every payable/receivable links to a counterparty of its OWN scope (zero cross-scope)', async () => {
    const payables = await db.$queryRawUnsafe<
      { userId: string; unitId: string; supplierName: string; counterpartyId: string | null; cUserId: string; cUnitId: string; cType: string; cName: string }[]
    >(
      `SELECT p."userId" AS "userId", p."unitId" AS "unitId", p."supplierName" AS "supplierName", p."counterpartyId" AS "counterpartyId",
              c."userId" AS "cUserId", c."unitId" AS "cUnitId", c."type" AS "cType", c."name" AS "cName"
       FROM "payables" p JOIN "counterparties" c ON p."counterpartyId" = c."id"`,
    );
    const totalPayables = await db.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*) AS n FROM "payables" WHERE "counterpartyId" IS NULL`);
    expect(Number(totalPayables[0].n)).toBe(0);
    for (const p of payables) {
      expect(p.cUserId).toBe(p.userId);
      expect(p.cUnitId).toBe(p.unitId);
      expect(p.cType).toBe('SUPPLIER');
      expect(p.cName).toBe(p.supplierName);
    }
    // Cross-scope raw guard (the exact smoke-gate assertion): no link crosses a tenant boundary.
    const crossScope = await db.$queryRawUnsafe<{ n: number }[]>(
      `SELECT COUNT(*) AS n FROM "payables" p JOIN "counterparties" c ON p."counterpartyId" = c."id"
       WHERE p."userId" <> c."userId" OR p."unitId" <> c."unitId";`,
    );
    expect(Number(crossScope[0].n)).toBe(0);

    const receivables = await db.$queryRawUnsafe<
      { userId: string; customerName: string; cUserId: string; cType: string; cName: string }[]
    >(
      `SELECT r."userId" AS "userId", r."customerName" AS "customerName",
              c."userId" AS "cUserId", c."type" AS "cType", c."name" AS "cName"
       FROM "receivables" r JOIN "counterparties" c ON r."counterpartyId" = c."id"`,
    );
    for (const r of receivables) {
      expect(r.cUserId).toBe(r.userId);
      expect(r.cType).toBe('CUSTOMER');
      expect(r.cName).toBe(r.customerName);
    }
  });

  it('is idempotent — a 2nd backfill run adds nothing and throws no P2002', async () => {
    const countCp = async () => Number((await db.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*) AS n FROM "counterparties"`))[0].n);
    const before = await countCp();
    await runBackfill(db, backfill); // must not throw
    const after = await countCp();
    expect(after).toBe(before);
  });
});
