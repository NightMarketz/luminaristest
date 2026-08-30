/**
 * Integration test: ReconciliationRepository.findLinesWithActiveMatches against a
 * REAL SQLite database — BE-INCR-7 UNMATCH read-shape. No mocks. Proves what a mocked
 * service test cannot: the `include` filters to ACTIVE matches (unmatchedAt == null),
 * maps the entry summary that labels the undo (D3/D7), returns [] for UNMATCHED lines, is
 * ordered by lineNumber, honours the status filter, and NEVER leaks another tenant's matches.
 *
 * Also covers findLinesByStatement's `opts.take` / `opts.afterLineNumber` (BE-W2E, added
 * for ReconciliationService.autoMatchStatement's chunked batches) against the SAME real
 * DB — the mocked ReconciliationService.automatch.test.ts proves the service-level loop
 * logic, but only a real Prisma query proves `take`/`lineNumber: { gt }` actually compile
 * to the intended SQL (the mocked tests never touch prisma.*).
 *
 * Mirrors the dedicated-client pattern of SourceProvenance.integration.test.ts. The repo
 * method is exercised by passing the test client as its `tx` arg — the singleton `prisma`
 * is never touched (no global override needed).
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { PrismaClient, type Prisma } from 'generated/prisma';
import { ReconciliationRepository } from '../ReconciliationRepository';
import type { AccountingScope } from '../../scope/AccountingScope';

const SERVER_ROOT = path.join(__dirname, '../../../../../');

const scope: AccountingScope = {
  ownerUserId: 'u-recon',
  actorUserId: 'u-recon',
  unitId: 'unit-recon',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

describe('ReconciliationRepository.findLinesWithActiveMatches — real SQLite DB (BE-INCR-7)', () => {
  let db: PrismaClient;
  let dbPath: string;
  const repo = new ReconciliationRepository();
  // Passing the test client as `tx` makes the repo read from this DB (tx ?? prisma).
  const asTx = () => db as unknown as Prisma.TransactionClient;

  beforeAll(async () => {
    dbPath = path.join(os.tmpdir(), `incr7-unmatch-${Date.now()}.db`);
    execSync('npx prisma migrate deploy', {
      cwd: SERVER_ROOT,
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: 'pipe',
    });
    db = new PrismaClient({ datasources: { db: { url: `file:${dbPath}?connection_limit=1` } } });
    await db.$connect();

    await db.user.create({
      data: { id: 'u-recon', name: 'Recon', username: 'reconuser', email: 'recon@test.local', password: 'x', role: 'USER' },
    });
    await db.account.create({
      data: { id: 'acc-bank', userId: 'u-recon', unitId: 'unit-recon', code: '1.1.1', name: 'Banco', nature: 'Asset', acceptsEntries: true },
    });
    await db.journalEntry.create({
      data: {
        id: 'je1', userId: 'u-recon', unitId: 'unit-recon', date: new Date('2026-06-16T00:00:00.000Z'),
        description: 'Venda à vista', status: 'Posted', fiscalYear: 2026, entryNumber: 1,
      },
    });
    await db.posting.create({
      data: { id: 'p1', userId: 'u-recon', unitId: 'unit-recon', entryId: 'je1', accountId: 'acc-bank', debitCents: 15000, creditCents: 0 },
    });
    await db.posting.create({
      data: { id: 'p2', userId: 'u-recon', unitId: 'unit-recon', entryId: 'je1', accountId: 'acc-bank', debitCents: 5000, creditCents: 0 },
    });
    await db.bankStatement.create({
      data: {
        id: 'st1', userId: 'u-recon', unitId: 'unit-recon', glAccountId: 'acc-bank',
        periodStart: new Date('2026-06-01T00:00:00.000Z'), periodEnd: new Date('2026-06-30T00:00:00.000Z'), sha256: 'hash-1',
      },
    });
    // l1 MATCHED (one active + one undone match); l2 UNMATCHED.
    await db.bankStatementLine.create({
      data: { id: 'l1', userId: 'u-recon', unitId: 'unit-recon', statementId: 'st1', lineNumber: 1, date: new Date('2026-06-15T00:00:00.000Z'), amountCents: 15000, description: 'linha casada', status: 'MATCHED', rawJson: '[]' },
    });
    await db.bankStatementLine.create({
      data: { id: 'l2', userId: 'u-recon', unitId: 'unit-recon', statementId: 'st1', lineNumber: 2, date: new Date('2026-06-17T00:00:00.000Z'), amountCents: 9900, description: 'linha pendente', status: 'UNMATCHED', rawJson: '[]' },
    });
    // ACTIVE match (l1↔p1) and an UNDONE match (l1↔p2, unmatchedAt set) — the filter's target.
    await db.reconciliationMatch.create({
      data: { id: 'm-active', userId: 'u-recon', unitId: 'unit-recon', statementLineId: 'l1', postingId: 'p1', matchType: 'AUTO' },
    });
    await db.reconciliationMatch.create({
      data: { id: 'm-undone', userId: 'u-recon', unitId: 'unit-recon', statementLineId: 'l1', postingId: 'p2', matchType: 'MANUAL', unmatchedAt: new Date('2026-06-18T00:00:00.000Z') },
    });
  }, 60000);

  afterAll(async () => {
    await db.$disconnect();
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(dbPath + suffix); } catch { /* ignore */ }
    }
  });

  it('MATCHED line carries ONLY its active match, with the entry summary that labels the undo', async () => {
    const lines = await repo.findLinesWithActiveMatches(scope, 'st1', undefined, asTx());
    expect(lines.map((l) => l.id)).toEqual(['l1', 'l2']); // lineNumber asc

    const l1 = lines.find((l) => l.id === 'l1')!;
    expect(l1.activeMatches).toHaveLength(1); // m-undone excluded by unmatchedAt == null
    expect(l1.activeMatches[0]).toEqual({
      id: 'm-active',
      postingId: 'p1',
      matchType: 'AUTO',
      entry: { id: 'je1', date: new Date('2026-06-16T00:00:00.000Z'), description: 'Venda à vista' },
    });
  });

  it('UNMATCHED line has no active matches', async () => {
    const lines = await repo.findLinesWithActiveMatches(scope, 'st1', undefined, asTx());
    const l2 = lines.find((l) => l.id === 'l2')!;
    expect(l2.activeMatches).toEqual([]);
  });

  it('honours the status filter (MATCHED → only l1)', async () => {
    const lines = await repo.findLinesWithActiveMatches(scope, 'st1', 'MATCHED', asTx());
    expect(lines.map((l) => l.id)).toEqual(['l1']);
    expect(lines[0].activeMatches).toHaveLength(1);
  });

  it('never leaks another tenant’s lines/matches (scope isolation)', async () => {
    const otherScope: AccountingScope = { ...scope, unitId: 'unit-other' };
    const lines = await repo.findLinesWithActiveMatches(otherScope, 'st1', undefined, asTx());
    expect(lines).toEqual([]);
  });
});

describe('ReconciliationRepository.findLinesByStatement — take/afterLineNumber (BE-W2E)', () => {
  let db: PrismaClient;
  let dbPath: string;
  const repo = new ReconciliationRepository();
  const asTx = () => db as unknown as Prisma.TransactionClient;

  beforeAll(async () => {
    dbPath = path.join(os.tmpdir(), `incr7-chunk-${Date.now()}.db`);
    execSync('npx prisma migrate deploy', {
      cwd: SERVER_ROOT,
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: 'pipe',
    });
    db = new PrismaClient({ datasources: { db: { url: `file:${dbPath}?connection_limit=1` } } });
    await db.$connect();

    await db.user.create({
      data: { id: 'u-recon', name: 'Recon', username: 'reconuser', email: 'recon@test.local', password: 'x', role: 'USER' },
    });
    await db.account.create({
      data: { id: 'acc-bank', userId: 'u-recon', unitId: 'unit-recon', code: '1.1.1', name: 'Banco', nature: 'Asset', acceptsEntries: true },
    });
    await db.bankStatement.create({
      data: {
        id: 'st1', userId: 'u-recon', unitId: 'unit-recon', glAccountId: 'acc-bank',
        periodStart: new Date('2026-06-01T00:00:00.000Z'), periodEnd: new Date('2026-06-30T00:00:00.000Z'), sha256: 'hash-chunk',
      },
    });
    // 5 lines, lineNumber 1..5 — l2 is MATCHED (removed from the UNMATCHED cursor), rest UNMATCHED.
    for (let n = 1; n <= 5; n++) {
      await db.bankStatementLine.create({
        data: {
          id: `l${n}`, userId: 'u-recon', unitId: 'unit-recon', statementId: 'st1', lineNumber: n,
          date: new Date('2026-06-15T00:00:00.000Z'), amountCents: 1000 + n, description: `linha ${n}`,
          status: n === 2 ? 'MATCHED' : 'UNMATCHED', rawJson: '[]',
        },
      });
    }
  }, 60000);

  afterAll(async () => {
    await db.$disconnect();
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(dbPath + suffix); } catch { /* ignore */ }
    }
  });

  it('opts.take bounds the page size, ordered by lineNumber asc', async () => {
    const page = await repo.findLinesByStatement(scope, 'st1', undefined, asTx(), { take: 2 });
    expect(page.map((l) => l.lineNumber)).toEqual([1, 2]);
  });

  it('opts.afterLineNumber seeks past already-visited lines, take+afterLineNumber compose', async () => {
    const page1 = await repo.findLinesByStatement(scope, 'st1', undefined, asTx(), { take: 2 });
    expect(page1.map((l) => l.lineNumber)).toEqual([1, 2]);
    const page2 = await repo.findLinesByStatement(scope, 'st1', undefined, asTx(), {
      take: 2,
      afterLineNumber: page1[page1.length - 1].lineNumber,
    });
    expect(page2.map((l) => l.lineNumber)).toEqual([3, 4]);
    const page3 = await repo.findLinesByStatement(scope, 'st1', undefined, asTx(), {
      take: 2,
      afterLineNumber: page2[page2.length - 1].lineNumber,
    });
    expect(page3.map((l) => l.lineNumber)).toEqual([5]); // short page — the "done" signal
  });

  it('status filter + afterLineNumber compose (the actual autoMatchStatement query shape)', async () => {
    // status=UNMATCHED excludes l2 (MATCHED) regardless of lineNumber order.
    const page = await repo.findLinesByStatement(scope, 'st1', 'UNMATCHED', asTx(), {
      take: 200,
      afterLineNumber: 0,
    });
    expect(page.map((l) => l.lineNumber)).toEqual([1, 3, 4, 5]);
  });

  it('no opts → unbounded, unchanged pre-existing behaviour', async () => {
    const all = await repo.findLinesByStatement(scope, 'st1', undefined, asTx());
    expect(all).toHaveLength(5);
  });
});
