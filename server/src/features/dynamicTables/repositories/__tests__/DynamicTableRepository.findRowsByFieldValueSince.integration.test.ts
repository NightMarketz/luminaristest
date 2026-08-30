/**
 * Integration test: `DynamicTableRepository.findRowsByFieldValueSince` against a REAL SQLite
 * database — BRIEF-W2-F (F6), the reconcile job's trailing watermark. Two things a mocked test
 * cannot prove:
 *
 *  1. Prisma's raw-query `Date` parameter binding actually round-trips through SQLite's
 *     NUMERIC-affinity `updatedAt` column (ms-epoch integer storage — confirmed by probing this
 *     DB directly during planning: a literal ISO string compares as TEXT against that integer
 *     and silently matches zero rows; a `Date` object parameter matches correctly). A mocked
 *     `$queryRaw` never exercises SQLite's actual comparison semantics.
 *  2. The FALSIFICADOR the BRIEF requires (item 5): the REJECTED "max-updatedAt-seen" cursor
 *     design permanently loses a row whose `updatedAt` was stamped BEFORE a cursor value that
 *     was already persisted by an earlier tick — even though that row's write only became
 *     durable/visible AFTER the cursor was computed (the SQLite `busy_timeout=5000` commit-delay
 *     race the BRIEF's design note describes). The proposed trailing-watermark design (this
 *     repo method, given `runStartAt - OVERLAP_MS`) includes the SAME row. Both sides are
 *     constructed here by directly stamping `updatedAt` via raw SQL (bypassing Prisma's
 *     `@updatedAt` auto-touch) — the BRIEF explicitly allows "by construction of the test,
 *     documented" instead of reproducing real lock contention.
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { PrismaClient } from 'generated/prisma';
import { DynamicTableRepository } from '../DynamicTableRepository';
import { OVERLAP_MS } from '../../../../jobs/accountingSyncReconcile.job';

const SERVER_ROOT = path.join(__dirname, '../../../../../');

describe('DynamicTableRepository.findRowsByFieldValueSince — real SQLite DB (BRIEF-W2-F)', () => {
  let db: PrismaClient;
  let dbPath: string;
  let tableId: string;
  let repo: DynamicTableRepository;

  // Anchor instant standing in for "tick N's runStartAt" in the BRIEF's design note.
  const RUN_START_AT = new Date('2026-08-30T12:00:00.000Z');
  // The row's write is stamped 2 minutes BEFORE runStartAt — it only becomes visible to a query
  // issued AT runStartAt because of the busy_timeout queueing delay the BRIEF describes, but its
  // `updatedAt` timestamp itself already precedes runStartAt.
  const ROW_UPDATED_AT = new Date(RUN_START_AT.getTime() - 2 * 60 * 1000);
  // An earlier tick's "max updatedAt seen" cursor — ALREADY persisted, and already AHEAD of
  // ROW_UPDATED_AT (this is exactly the ordering the BRIEF's design note calls out: the cursor
  // advanced past a value a still-uncommitted write would later carry).
  const NAIVE_CURSOR_ALREADY_PERSISTED = new Date(RUN_START_AT.getTime() - 1 * 60 * 1000);

  beforeAll(async () => {
    dbPath = path.join(os.tmpdir(), `w2f-watermark-${Date.now()}.db`);
    execSync('npx prisma migrate deploy', {
      cwd: SERVER_ROOT,
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: 'pipe',
    });
    db = new PrismaClient({ datasources: { db: { url: `file:${dbPath}?connection_limit=1` } } });
    await db.$connect();
    repo = new DynamicTableRepository(db);

    await db.user.create({
      data: {
        id: 'u-w2f', name: 'W2F', username: 'w2fuser', email: 'w2f@test.local', password: 'x', role: 'USER',
      },
    });
    const table = await db.dynamicTable.create({
      data: { userId: 'u-w2f', name: 'CRM Opportunities', internalName: 'crmOpportunities', category: 'sales', schema: {} },
    });
    tableId = table.id;

    const row = await db.dynamicTableData.create({
      data: { dynamicTableId: tableId, data: { status: 'Won' } },
    });
    // Bypass Prisma's `@updatedAt` auto-touch: stamp the row's updatedAt directly, simulating a
    // write whose commit becomes durable only NOW but whose timestamp precedes runStartAt.
    await db.$executeRaw`UPDATE "dynamic_table_data" SET "updatedAt" = ${ROW_UPDATED_AT} WHERE "id" = ${row.id}`;
  }, 60000);

  afterAll(async () => {
    await db.$disconnect();
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(dbPath + suffix); } catch { /* ignore */ }
    }
  });

  it('REJECTED design: a "max updatedAt seen" cursor never sees the row again (vermelho by construction)', async () => {
    // Reproduces the rejected design inline (it is NOT implemented anywhere in the codebase —
    // that is the point): `WHERE updatedAt > <already-persisted cursor>`. Uses the same $queryRaw
    // mechanics as the real repository method, against the SAME real column, so the comparison
    // semantics are the genuine SQLite ones, not an assumption.
    const naiveResult: Array<{ id: string }> = await db.$queryRaw`
      SELECT id FROM "dynamic_table_data"
      WHERE "dynamicTableId" = ${tableId}
        AND "deletedAt" IS NULL
        AND json_extract(data, '$.status') = 'Won'
        AND "updatedAt" > ${NAIVE_CURSOR_ALREADY_PERSISTED}
    `;
    expect(naiveResult).toEqual([]);

    // Not a one-tick fluke: the naive cursor only ever grows (it is fed by `max(updatedAt)` seen
    // across ticks), so re-running the SAME query with a cursor further in the future never
    // recovers the row either — it is lost permanently, exactly the invariant violation the
    // BRIEF's design note names.
    const stillNaiveResult: Array<{ id: string }> = await db.$queryRaw`
      SELECT id FROM "dynamic_table_data"
      WHERE "dynamicTableId" = ${tableId}
        AND "deletedAt" IS NULL
        AND json_extract(data, '$.status') = 'Won'
        AND "updatedAt" > ${new Date(NAIVE_CURSOR_ALREADY_PERSISTED.getTime() + 60_000)}
    `;
    expect(stillNaiveResult).toEqual([]);
  });

  it('PROPOSED design: the trailing watermark (runStartAt - OVERLAP_MS) DOES include the row', async () => {
    const watermarkAt = new Date(RUN_START_AT.getTime() - OVERLAP_MS);
    // Sanity on the fixture itself: the row's updatedAt sits inside [watermarkAt, RUN_START_AT] —
    // if this failed, the test below would pass for the wrong reason.
    expect(ROW_UPDATED_AT.getTime()).toBeGreaterThanOrEqual(watermarkAt.getTime());

    const rows = await repo.findRowsByFieldValueSince(tableId, 'status', 'Won', watermarkAt);

    expect(rows.map((r) => r.id)).toEqual(
      (await db.dynamicTableData.findMany({ where: { dynamicTableId: tableId } })).map((r) => r.id),
    );
    expect(rows).toHaveLength(1);
  });

  it('regression: an absent watermark (EPOCH — first run post-deploy) still returns every row, matching pre-watermark full-scan behavior', async () => {
    const rows = await repo.findRowsByFieldValueSince(tableId, 'status', 'Won', new Date(0));
    expect(rows).toHaveLength(1);

    // Also unchanged: the ORIGINAL (non-watermarked) method, still used by every other of its
    // 15+ call sites, keeps returning the row with no time filter at all.
    const unfiltered = await repo.findRowsByFieldValue(tableId, 'status', 'Won');
    expect(unfiltered).toHaveLength(1);
  });
});
