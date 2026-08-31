/**
 * Integration test: money-cents ceiling against a REAL SQLite database (no mocks).
 *
 * REWRITTEN for BE-INCR-MONEY-BIGINT (F2/F-W2B-1, BRIEF-W2-B §1.5): `Posting.debitCents`/
 * `creditCents` (and every other `*Cents` column, F-W2B-1 "tudo de uma vez") used to be
 * Prisma `Int` — a 32-bit signed integer REGARDLESS of the underlying connector (SQLite itself
 * has no such width limit; Prisma Client enforced it before the value ever reached the query
 * engine). ACC-INCR6-J-001 was CONFIRMED here: a single leg one cent over Int32 max either failed
 * the write outright or wrote successfully and POISONED every later read of that row with a raw
 * unhandled `PrismaClientKnownRequestError` — never a `ValidationError`.
 *
 * Post-migration, the column is `BigInt`: the three `it`s below flip meaning exactly as the BRIEF
 * anticipated — "CONFIRMED BUG" becomes "the value that used to poison the row now posts and
 * reads back exact", and a 4th `it` is ADDED for the new failure mode BigInt introduces at the far
 * end: a value that would lose precision past `Number.MAX_SAFE_INTEGER` must fail LOUD at the
 * bigint->number read/serialization boundary (F-W2B-3, `centsFromDb`/`jsonBigintReplacer`) instead
 * of silently truncating.
 *
 * `CustomerPackageBalance.balanceCents` was assumed by the initial parecer to be the
 * accumulating GL balance — it is NOT. It belongs to a separate prepaid-package
 * feature; the general-ledger balance (BP/DRE/Balancete) is never persisted, it is
 * computed on the fly via `PostingRepository.groupByAccount`'s `_sum` aggregate over
 * `debitCents`/`creditCents`.
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { PrismaClient } from 'generated/prisma';
import { centsFromDb } from '../../models/money';
import { jsonBigintReplacer } from '../../../../lib/jsonBigintReplacer';

const SERVER_ROOT = path.join(__dirname, '../../../../../');
const OVER_INT32 = 2_147_483_648; // 2^31 — one cent over the OLD Int32 max (2^31 - 1)
const THIRTY_MILLION_REAIS_CENTS = 3_000_000_000; // R$ 30M in cents — well above the old Int32 ceiling

describe('Posting.debitCents/creditCents — BigInt ceiling, real SQLite DB (BE-INCR-MONEY-BIGINT)', () => {
  let db: PrismaClient;
  let dbPath: string;

  beforeAll(async () => {
    dbPath = path.join(os.tmpdir(), `incr6-money-${Date.now()}.db`);
    execSync('npx prisma migrate deploy', {
      cwd: SERVER_ROOT,
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: 'pipe',
    });
    db = new PrismaClient({
      datasources: { db: { url: `file:${dbPath}?connection_limit=1` } },
    });
    await db.user.create({
      data: {
        id: 'u-money',
        name: 'Money User',
        username: 'moneyuser',
        email: 'money@test.local',
        password: 'x',
        role: 'USER',
      },
    });
    // Each test gets its own account so postings left behind by one `it` (deliberately,
    // to probe write/read behavior) can never bleed into another `it`'s aggregate —
    // groupBy below is scoped `by: ['accountId']`, so cross-test isolation only holds if
    // the account id itself is unique per test.
    for (const id of ['acc-money-1', 'acc-money-2', 'acc-money-3']) {
      await db.account.create({
        data: { id, userId: 'u-money', unitId: 'unit-money', code: `1.1.${id}`, name: 'Caixa', nature: 'Asset' },
      });
    }
    await db.journalEntry.create({
      data: {
        id: 'entry-money',
        userId: 'u-money',
        unitId: 'unit-money',
        date: new Date('2026-06-23'),
        description: 'Overflow probe',
        status: 'Posted',
        fiscalYear: 2026,
        entryNumber: 1,
      },
    });
  }, 60000);

  afterAll(async () => {
    await db.$disconnect();
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(dbPath + suffix); } catch {}
    }
  });

  it('FIXED (ACC-INCR6-J-001 closed by BE-INCR-MONEY-BIGINT): a value one cent over the OLD ' +
    'Int32 max now posts and reads back EXACT end-to-end — no poisoned row, no raw ' +
    'PrismaClientKnownRequestError', async () => {
    const created = await db.posting.create({
      data: {
        userId: 'u-money',
        unitId: 'unit-money',
        entryId: 'entry-money',
        accountId: 'acc-money-1',
        debitCents: OVER_INT32,
        creditCents: 0,
      },
    });
    expect(created.debitCents).toBe(BigInt(OVER_INT32));

    // The read that used to be POISONED (PrismaClientKnownRequestError, "does not fit in an
    // INT column") now succeeds and round-trips the exact value.
    const rows = await db.posting.findMany({ where: { accountId: 'acc-money-1' } });
    expect(rows).toHaveLength(1);
    expect(rows[0].debitCents).toBe(BigInt(OVER_INT32));

    // F-W2B-3 read boundary: converts back to `number` exactly (well inside safe-integer range).
    expect(centsFromDb(rows[0].debitCents)).toBe(OVER_INT32);
  });

  it('a leg of R$ 30M (2^31 x 1.4, far past the old Int32 ceiling) posts and reads back correct ' +
    'ponta a ponta, including through the F-W2B-3 bigint->number read boundary', async () => {
    const created = await db.posting.create({
      data: {
        userId: 'u-money',
        unitId: 'unit-money',
        entryId: 'entry-money',
        accountId: 'acc-money-2',
        debitCents: THIRTY_MILLION_REAIS_CENTS,
        creditCents: 0,
      },
    });
    expect(created.debitCents).toBe(BigInt(THIRTY_MILLION_REAIS_CENTS));

    const reread = await db.posting.findUnique({ where: { id: created.id } });
    expect(reread?.debitCents).toBe(BigInt(THIRTY_MILLION_REAIS_CENTS));
    expect(centsFromDb(reread!.debitCents)).toBe(THIRTY_MILLION_REAIS_CENTS);

    // ... and it survives the actual HTTP serialization path (jsonBigintReplacer, app.ts wiring)
    // without losing precision — this is what a controller returning the raw row goes through.
    const wire = JSON.parse(JSON.stringify(reread, jsonBigintReplacer));
    expect(wire.debitCents).toBe(THIRTY_MILLION_REAIS_CENTS);
  });

  it('groupByAccount aggregates correctly (BigInt _sum) — two individually-legal-under-the-OLD-' +
    'ceiling postings summed by SQL past where Int32 used to clip', async () => {
    // Two legs of R$15M each (1.5B cents) — EACH ONE IS A PERFECTLY LEGAL Int32 value on
    // its own (well under 2,147,483,647). Nothing about this requires anyone to post an
    // illegally huge single entry; it only requires an account's lifetime Σdebit to cross
    // ~R$21.47M, which is a realistic outcome of ordinary business activity over time.
    // This is exactly the aggregate PostingRepository.groupByAccount exposes to the
    // Balancete/BP/DRE (Increment 4/6 reports) — there is no persisted running balance in
    // the GL, every trial-balance figure is computed on the fly through this same _sum.
    // Post-migration `_sum.debitCents` comes back `bigint | null` (ACC-INCR6-J-002 was never a
    // bug even pre-migration — SQLite's SUM() has no 32-bit column-width constraint; this test
    // now also proves the BigInt _sum round-trips through `centsFromDb` exactly).
    await db.posting.create({
      data: { userId: 'u-money', unitId: 'unit-money', entryId: 'entry-money', accountId: 'acc-money-3', debitCents: 1_500_000_000, creditCents: 0 },
    });
    await db.posting.create({
      data: { userId: 'u-money', unitId: 'unit-money', entryId: 'entry-money', accountId: 'acc-money-3', debitCents: 1_500_000_000, creditCents: 0 },
    });

    const grouped = await db.posting.groupBy({
      by: ['accountId'],
      where: { accountId: 'acc-money-3' },
      _sum: { debitCents: true, creditCents: true },
    });
    const total = grouped.find((g) => g.accountId === 'acc-money-3')?._sum.debitCents;
    expect(total).toBe(3_000_000_000n);
    expect(centsFromDb(total ?? 0n)).toBe(3_000_000_000);
  });

  it('F-W2B-3 guard: a *Cents value past Number.MAX_SAFE_INTEGER fails LOUD at the read/' +
    'serialization boundary instead of silently losing precision', async () => {
    // BigInt easily holds a value this large; `centsFromDb`/`jsonBigintReplacer` are the policy
    // guard that refuses to hand a lossy `number` up to business logic or the wire.
    const tooLarge = BigInt(Number.MAX_SAFE_INTEGER) + 100n;
    const created = await db.posting.create({
      data: {
        userId: 'u-money',
        unitId: 'unit-money',
        entryId: 'entry-money',
        accountId: 'acc-money-3',
        debitCents: tooLarge,
        creditCents: 0,
      },
    });
    // The database and the raw Prisma read both hold/return the exact bigint — no loss there.
    expect(created.debitCents).toBe(tooLarge);

    // The bigint->number read boundary refuses to convert it silently.
    expect(() => centsFromDb(created.debitCents)).toThrow(/MAX_SAFE_INTEGER/);
    // ... and so does the HTTP serialization boundary, if a raw row like this one ever reached it.
    expect(() => JSON.stringify({ debitCents: created.debitCents }, jsonBigintReplacer)).toThrow(
      /MAX_SAFE_INTEGER/,
    );

    // Clean up so this poison-adjacent row doesn't bleed into other suites reading acc-money-3.
    await db.posting.delete({ where: { id: created.id } });
  });
});
