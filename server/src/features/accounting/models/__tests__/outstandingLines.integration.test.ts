/**
 * Integration test: `loadOutstandingPayables`/`loadOutstandingReceivables` (the shared helper
 * extracted for FE-INCR-CASH-FORECAST, item 2 of the checklist) against a REAL SQLite database.
 * No mocks — proves the SCHEMA-LEVEL read (`findOutstanding` WHERE-clause + the `BigInt -> number`
 * `centsFromDb` bridge at the read boundary) that a mocked service test cannot
 * (sintetico-nao-cobre-formato-de-dado-real / repositorios-de-contabilidade-nao-sao-exercitados):
 * `CashForecastReportService` and `AgingReportService` both consume this helper, so proving it here
 * once against real repositories + a real Prisma client covers the repository-touching part of BOTH
 * services without duplicating `AgingOutstanding.integration.test.ts` (which already proves the
 * `findOutstanding` WHERE-clause itself, status-by-status).
 *
 * This file's addition: `amountCents` round-trips through the REAL BigInt column
 * (`int_to_bigint_cents` migration) via `centsFromDb` without precision loss, and `dueDate` comes
 * back as a real `Date` at UTC midnight (ms-epoch column) — the two facts `CashForecastReportService`
 * depends on for its day-calendar bucketing.
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { PrismaClient } from 'generated/prisma';
import { PayableRepository } from '../../repositories/PayableRepository';
import { ReceivableRepository } from '../../repositories/ReceivableRepository';
import { loadOutstandingPayables, loadOutstandingReceivables } from '../outstandingLines';
import type { AccountingScope } from '../../scope/AccountingScope';
import { normalizeCounterpartyName } from '../Counterparty.model';

const SERVER_ROOT = path.join(__dirname, '../../../../../');
const USER_ID = 'u-cash-forecast';
const UNIT = 'unit-cash-forecast';

const scope: AccountingScope = {
  ownerUserId: USER_ID,
  actorUserId: USER_ID,
  unitId: UNIT,
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

describe('outstandingLines (loadOutstandingPayables/Receivables) — real SQLite DB (FE-INCR-CASH-FORECAST)', () => {
  let db: PrismaClient;
  let dbPath: string;

  beforeAll(async () => {
    dbPath = path.join(os.tmpdir(), `cash-forecast-${Date.now()}.db`);
    execSync('npx prisma migrate deploy', {
      cwd: SERVER_ROOT,
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: 'pipe',
    });
    db = new PrismaClient({
      datasources: { db: { url: `file:${dbPath}?socket_timeout=60&connection_limit=1` } },
    });
    await db.user.create({
      data: { id: USER_ID, name: 'Cash Forecast User', username: 'cashforecastuser', email: 'cash-forecast@test.local', password: 'x', role: 'USER' },
    });
    await db.account.create({
      data: { id: 'acc-exp', userId: USER_ID, unitId: UNIT, code: '4.1', name: 'Despesas', nature: 'Expense', acceptsEntries: true },
    });
    await db.account.create({
      data: { id: 'acc-rev', userId: USER_ID, unitId: UNIT, code: '3.1', name: 'Receitas', nature: 'Revenue', acceptsEntries: true },
    });
    await db.counterparty.create({
      data: { id: 'cp-cf', userId: USER_ID, unitId: UNIT, type: 'SUPPLIER', name: 'Contraparte CF', nameNormalized: normalizeCounterpartyName('Contraparte CF'), createdById: USER_ID },
    });

    // Um payable grande o bastante para provar que a ponte BigInt->number não trunca (bem abaixo
    // de Number.MAX_SAFE_INTEGER, mas acima do que um `Int` de 32 bits aguentaria pré-migração).
    await db.payable.create({
      data: {
        id: 'p-open', userId: USER_ID, unitId: UNIT, supplierName: 'Fornecedor Grande', documentNumber: 'NF-p-open',
        description: 'x', issueDate: new Date('2026-06-01'), dueDate: new Date('2026-08-15'),
        amountCents: 300_000_000, expenseAccountId: 'acc-exp', counterpartyId: 'cp-cf', status: 'OPEN',
      },
    });
    // Terminal — não deve aparecer no outstanding.
    await db.payable.create({
      data: {
        id: 'p-paid', userId: USER_ID, unitId: UNIT, supplierName: 'Fornecedor Pago', documentNumber: 'NF-p-paid',
        description: 'x', issueDate: new Date('2026-06-01'), dueDate: new Date('2026-08-15'),
        amountCents: 1000, expenseAccountId: 'acc-exp', counterpartyId: 'cp-cf', status: 'PAID',
      },
    });

    await db.receivable.create({
      data: {
        id: 'r-receiving', userId: USER_ID, unitId: UNIT, customerName: 'Cliente Grande', documentNumber: 'FT-r-receiving',
        description: 'x', issueDate: new Date('2026-06-01'), dueDate: new Date('2026-08-20'),
        amountCents: 250_000_000, revenueAccountId: 'acc-rev', counterpartyId: 'cp-cf', status: 'RECEIVING',
      },
    });
  }, 60000);

  afterAll(async () => {
    if (db) await db.$disconnect();
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(dbPath + suffix); } catch {}
    }
  });

  it('loadOutstandingPayables: lê SÓ OPEN (exclui PAID); amountCents e dueDate íntegros no boundary BigInt->number', async () => {
    const repo = new PayableRepository();
    const lines = await loadOutstandingPayables(scope, repo);
    expect(lines.map((l) => l.id)).toEqual(['p-open']);
    expect(lines[0].amountCents).toBe(300_000_000);
    expect(Number.isSafeInteger(lines[0].amountCents)).toBe(true);
    expect(lines[0].dueDate.toISOString().slice(0, 10)).toBe('2026-08-15');
    expect(lines[0].counterpartyName).toBe('Fornecedor Grande');
  });

  it('loadOutstandingReceivables: inclui RECEIVING (em trânsito, F-CF4→a herdado); customerName como snapshot', async () => {
    const repo = new ReceivableRepository();
    const lines = await loadOutstandingReceivables(scope, repo);
    expect(lines.map((l) => l.id)).toEqual(['r-receiving']);
    expect(lines[0].amountCents).toBe(250_000_000);
    expect(lines[0].counterpartyName).toBe('Cliente Grande');
  });
}, 30000);
