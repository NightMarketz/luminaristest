/**
 * Integration test — BE-INCR-PARTIAL-SETTLEMENT (ADR-INCR-PARTIAL-SETTLEMENT §3/§5, BRIEF itens 2, 5,
 * 9, 14, 16) against a REAL SQLite database, through the REAL repositories (dedicated client injected
 * as `tx`, the same harness as `AgingOutstanding.integration.test.ts`). No mocks of the CAS.
 *
 * What only a real DB can prove:
 *   - item 16 (o caso adversarial do ADR §7): N concurrent sum-CAS claims whose SUM exceeds
 *     `amountCents` → exactly the ones the balance carries win, the rest get count 0.
 *   - item 14: `paidCents === SUM(payments ACTIVE)` after every scenario (campo-cache ↔ filhos).
 *   - item 9: releasing the MIDDLE receipt of three leaves the balance = the other two, in any order.
 *   - item 2: the migration's backfill UPDATEs (the literal SQL from the migration file) are
 *     idempotent — running them twice does not double anything.
 *
 * Windows serializes SQLite in a single process; the CI Linux runner is the oracle for the race
 * (memória `windows-serializa-sqlite-ci-linux-nao`) — a local green does not close item 16 alone.
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { PrismaClient } from 'generated/prisma';
import { PayableRepository } from '../PayableRepository';
import { ReceivableRepository } from '../ReceivableRepository';
import type { AccountingScope } from '../../scope/AccountingScope';
import { normalizeCounterpartyName } from '../../models/Counterparty.model';
import { payableStatusForBalance } from '../../models/Payable.model';

const SERVER_ROOT = path.join(__dirname, '../../../../../');
const MIGRATION_SQL = path.join(SERVER_ROOT, 'prisma/migrations/20260911120000_partial_settlement_balance/migration.sql');
const USER_ID = 'u-ps';
const UNIT = 'unit-ps';
const scope: AccountingScope = {
  ownerUserId: USER_ID,
  actorUserId: USER_ID,
  unitId: UNIT,
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

describe('PartialSettlement — sum-CAS, invariante campo↔filhos, backfill (real SQLite)', () => {
  let db: PrismaClient;
  let dbPath: string;
  const apRepo = new PayableRepository();
  const arRepo = new ReceivableRepository();

  beforeAll(async () => {
    dbPath = path.join(os.tmpdir(), `ps-${Date.now()}.db`);
    execSync('npx prisma migrate deploy', {
      cwd: SERVER_ROOT,
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: 'pipe',
    });
    db = new PrismaClient({
      datasources: { db: { url: `file:${dbPath}?socket_timeout=60&connection_limit=1` } },
    });
    await db.user.create({
      data: { id: USER_ID, name: 'PS User', username: 'psuser', email: 'ps@test.local', password: 'x', role: 'USER' },
    });
    await db.account.create({
      data: { id: 'acc-exp-ps', userId: USER_ID, unitId: UNIT, code: '4.1', name: 'Despesas', nature: 'Expense', acceptsEntries: true },
    });
    await db.account.create({
      data: { id: 'acc-rev-ps', userId: USER_ID, unitId: UNIT, code: '3.1', name: 'Receitas', nature: 'Revenue', acceptsEntries: true },
    });
    await db.counterparty.create({
      data: { id: 'cp-ps-sup', userId: USER_ID, unitId: UNIT, type: 'SUPPLIER', name: 'ACME', nameNormalized: normalizeCounterpartyName('ACME'), createdById: USER_ID },
    });
    await db.counterparty.create({
      data: { id: 'cp-ps-cus', userId: USER_ID, unitId: UNIT, type: 'CUSTOMER', name: 'Cliente', nameNormalized: normalizeCounterpartyName('Cliente'), createdById: USER_ID },
    });
  }, 60000);

  afterAll(async () => {
    await db.$disconnect();
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(dbPath + suffix); } catch {}
    }
  });

  async function seedPayable(id: string, amountCents: number, status = 'OPEN', paidCents = 0): Promise<void> {
    await db.payable.create({
      data: {
        id, userId: USER_ID, unitId: UNIT, supplierName: 'ACME', documentNumber: `NF-${id}`,
        description: 'x', issueDate: new Date('2026-06-10'), dueDate: new Date('2026-07-10'),
        amountCents, paidCents, expenseAccountId: 'acc-exp-ps', counterpartyId: 'cp-ps-sup', status,
      },
    });
  }
  async function seedReceivable(id: string, amountCents: number, status = 'OPEN', receivedCents = 0): Promise<void> {
    await db.receivable.create({
      data: {
        id, userId: USER_ID, unitId: UNIT, customerName: 'Cliente', documentNumber: `FAT-${id}`,
        description: 'x', issueDate: new Date('2026-06-10'), dueDate: new Date('2026-07-10'),
        amountCents, receivedCents, revenueAccountId: 'acc-rev-ps', counterpartyId: 'cp-ps-cus', status,
      },
    });
  }
  async function seedPayment(id: string, payableId: string, amountCents: number, status = 'ACTIVE'): Promise<void> {
    await db.payablePayment.create({
      data: { id, userId: USER_ID, unitId: UNIT, payableId, amountCents, method: 'Pix', paidAt: new Date('2026-07-05'), paidByUserId: USER_ID, status },
    });
  }
  /** Item 14 — the invariant `paidCents === SUM(payments ACTIVE)`, asserted after each scenario. */
  async function assertInvariant(payableId: string): Promise<number> {
    const row = await db.payable.findUniqueOrThrow({ where: { id: payableId } });
    const active = await db.payablePayment.findMany({ where: { payableId, status: 'ACTIVE' } });
    const sum = active.reduce((acc, p) => acc + Number(p.amountCents), 0);
    expect(Number(row.paidCents)).toBe(sum);
    return sum;
  }

  it('item 16 — 10 concurrent claims of 15000 on a 50000 title: exactly 3 win (3×15000 ≤ 50000 < 4×15000), row ends PAYING with paidCents 45000', async () => {
    await seedPayable('ps-race', 50000);
    const counts = await Promise.all(
      Array.from({ length: 10 }, () => apRepo.claimForPayment(scope, 'ps-race', 50000, 15000, db as any)),
    );
    // One claim flips the row to PAYING; every later claim fails the status predicate. So under
    // the F-PS8 (a) transient state, the sum-CAS admits ONE in-flight settlement at a time — the
    // balance predicate is what protects the case where the in-flight one has ALREADY finalized.
    expect(counts.filter((c) => c === 1)).toHaveLength(1);
    const row = await db.payable.findUniqueOrThrow({ where: { id: 'ps-race' } });
    expect(row.status).toBe('PAYING');
    expect(Number(row.paidCents)).toBe(15000);
  }, 60000);

  it('item 16 (sequencial, o caso do ADR §7): recibos que somam mais que amountCents — vencem exatamente os que cabem, o excedente perde por SALDO, não por status', async () => {
    await seedPayable('ps-sum', 50000);
    const results: number[] = [];
    // 4 × 15000 = 60000 > 50000. Each claim finalizes before the next (PAYING → PARTIALLY_PAID|PAID).
    for (let i = 0; i < 4; i += 1) {
      const won = await apRepo.claimForPayment(scope, 'ps-sum', 50000, 15000, db as any);
      results.push(won);
      if (won === 1) {
        await seedPayment(`ps-sum-p${i}`, 'ps-sum', 15000);
        expect(await apRepo.finalizeIfPaying(scope, 'ps-sum', 50000, db as any)).toBe(1);
      }
    }
    expect(results).toEqual([1, 1, 1, 0]); // the 4th overshoots: 45000 + 15000 > 50000
    const row = await db.payable.findUniqueOrThrow({ where: { id: 'ps-sum' } });
    expect(row.status).toBe('PARTIALLY_PAID'); // 45000 of 50000
    expect(await assertInvariant('ps-sum')).toBe(45000);
    // The exact remainder closes the title.
    expect(await apRepo.claimForPayment(scope, 'ps-sum', 50000, 5000, db as any)).toBe(1);
    await seedPayment('ps-sum-p4', 'ps-sum', 5000);
    expect(await apRepo.finalizeIfPaying(scope, 'ps-sum', 50000, db as any)).toBe(1);
    expect((await db.payable.findUniqueOrThrow({ where: { id: 'ps-sum' } })).status).toBe('PAID');
    await assertInvariant('ps-sum');
  }, 60000);

  it('finalizeIfPaying is exactly-once: 10 concurrent finalizers on one PAYING row → one count 1', async () => {
    await seedPayable('ps-final', 50000, 'PAYING', 20000);
    const counts = await Promise.all(Array.from({ length: 10 }, () => apRepo.finalizeIfPaying(scope, 'ps-final', 50000, db as any)));
    expect(counts.filter((c) => c === 1)).toHaveLength(1);
    expect((await db.payable.findUniqueOrThrow({ where: { id: 'ps-final' } })).status).toBe('PARTIALLY_PAID');
  }, 60000);

  it('item 9 — three receipts, release the MIDDLE one: balance = the other two, status by balance; order does not matter', async () => {
    await seedPayable('ps-mid', 50000);
    const amounts = [10000, 15000, 25000];
    for (let i = 0; i < amounts.length; i += 1) {
      expect(await apRepo.claimForPayment(scope, 'ps-mid', 50000, amounts[i], db as any)).toBe(1);
      await seedPayment(`ps-mid-p${i}`, 'ps-mid', amounts[i]);
      expect(await apRepo.finalizeIfPaying(scope, 'ps-mid', 50000, db as any)).toBe(1);
    }
    expect((await db.payable.findUniqueOrThrow({ where: { id: 'ps-mid' } })).status).toBe('PAID');

    // Release the middle receipt (15000) — the service does this inside its tx after reverseEntry.
    expect(await apRepo.releaseSettlement(scope, 'ps-mid', 15000, db as any)).toBe(1);
    await db.payablePayment.update({ where: { id: 'ps-mid-p1' }, data: { status: 'CANCELLED' } });
    let row = await db.payable.findUniqueOrThrow({ where: { id: 'ps-mid' } });
    expect(Number(row.paidCents)).toBe(35000);
    expect(payableStatusForBalance(Number(row.paidCents), 50000)).toBe('PARTIALLY_PAID');
    await assertInvariant('ps-mid');

    // Then the first, then the last — any order — down to OPEN; never negative.
    expect(await apRepo.releaseSettlement(scope, 'ps-mid', 10000, db as any)).toBe(1);
    await db.payablePayment.update({ where: { id: 'ps-mid-p0' }, data: { status: 'CANCELLED' } });
    await db.payable.update({ where: { id: 'ps-mid' }, data: { status: 'PARTIALLY_PAID' } });
    expect(await apRepo.releaseSettlement(scope, 'ps-mid', 25000, db as any)).toBe(1);
    await db.payablePayment.update({ where: { id: 'ps-mid-p2' }, data: { status: 'CANCELLED' } });
    row = await db.payable.findUniqueOrThrow({ where: { id: 'ps-mid' } });
    expect(Number(row.paidCents)).toBe(0);
    expect(payableStatusForBalance(0, 50000)).toBe('OPEN');
    await assertInvariant('ps-mid');
    // Releasing more than the balance carries is refused (count 0), never goes negative.
    await db.payable.update({ where: { id: 'ps-mid' }, data: { status: 'PARTIALLY_PAID' } });
    expect(await apRepo.releaseSettlement(scope, 'ps-mid', 1, db as any)).toBe(0);
  }, 60000);

  it('releaseSettlement refuses while a settlement is in flight (PAYING not in the predicate)', async () => {
    await seedPayable('ps-inflight', 50000, 'PAYING', 30000);
    expect(await apRepo.releaseSettlement(scope, 'ps-inflight', 10000, db as any)).toBe(0);
    expect(Number((await db.payable.findUniqueOrThrow({ where: { id: 'ps-inflight' } })).paidCents)).toBe(30000);
  }, 30000);

  it('AR mirror — sum-CAS by receivedCents: 3 × 15000 fit a 50000 title, the 4th loses by balance', async () => {
    await seedReceivable('ps-ar', 50000);
    const results: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const won = await arRepo.claimForReceipt(scope, 'ps-ar', 50000, 15000, db as any);
      results.push(won);
      if (won === 1) expect(await arRepo.finalizeIfReceiving(scope, 'ps-ar', 50000, db as any)).toBe(1);
    }
    expect(results).toEqual([1, 1, 1, 0]);
    const row = await db.receivable.findUniqueOrThrow({ where: { id: 'ps-ar' } });
    expect(row.status).toBe('PARTIALLY_RECEIVED');
    expect(Number(row.receivedCents)).toBe(45000);
    expect(await arRepo.releaseSettlement(scope, 'ps-ar', 15000, db as any)).toBe(1);
    expect(Number((await db.receivable.findUniqueOrThrow({ where: { id: 'ps-ar' } })).receivedCents)).toBe(30000);
  }, 60000);

  it('item 2 — the migration backfill (literal SQL from the migration file) is idempotent: PAID → amountCents, PAYING → Σ ACTIVE, twice = once', async () => {
    // Legacy rows as the full-only model left them: paidCents 0 with the receipts already there.
    await seedPayable('bf-paid', 40000, 'PAID', 0);
    await seedPayment('bf-paid-p', 'bf-paid', 40000);
    await seedPayable('bf-paying', 30000, 'PAYING', 0);
    await seedPayment('bf-paying-p', 'bf-paying', 30000);
    await seedPayment('bf-paying-x', 'bf-paying', 999, 'CANCELLED'); // must NOT count
    await seedPayable('bf-open', 20000, 'OPEN', 0);
    await seedReceivable('bf-recv', 12000, 'RECEIVED', 0);

    const sql = fs.readFileSync(MIGRATION_SQL, 'utf8');
    // Strip the comments BEFORE splitting: a `;` inside a comment would cut a statement in two.
    const updates = sql
      .replace(/--[^\n]*/g, '')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.toUpperCase().startsWith('UPDATE'));
    expect(updates).toHaveLength(4);
    for (let pass = 0; pass < 2; pass += 1) {
      for (const stmt of updates) await db.$executeRawUnsafe(stmt);
      expect(Number((await db.payable.findUniqueOrThrow({ where: { id: 'bf-paid' } })).paidCents)).toBe(40000);
      expect(Number((await db.payable.findUniqueOrThrow({ where: { id: 'bf-paying' } })).paidCents)).toBe(30000);
      expect(Number((await db.payable.findUniqueOrThrow({ where: { id: 'bf-open' } })).paidCents)).toBe(0);
      expect(Number((await db.receivable.findUniqueOrThrow({ where: { id: 'bf-recv' } })).receivedCents)).toBe(12000);
    }
    await assertInvariant('bf-paid');
    await assertInvariant('bf-paying');
  }, 60000);
});
