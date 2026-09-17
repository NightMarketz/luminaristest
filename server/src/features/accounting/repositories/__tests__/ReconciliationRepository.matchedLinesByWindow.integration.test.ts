/**
 * Integration test: ReconciliationRepository.findMatchedLinesByWindow against a REAL SQLite
 * database (C6b PR-2 Passo 8 — fonte da seção MATCHED de `EXPORT_BANK_RECONCILIATION`, F-C6b-5 a).
 *
 * Proves what a mocked service test cannot: the `statement.glAccountId IN (...)` + `date` window
 * join actually compiles to the intended SQL, ACTIVE-match-only filtering (unmatchedAt == null),
 * the bank account CODE comes from the joined `Account`, and scope isolation (another tenant's
 * matched lines never leak). Mirrors the dedicated-client pattern of
 * ReconciliationRepository.activeMatches.integration.test.ts.
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
  ownerUserId: 'u-recon2',
  actorUserId: 'u-recon2',
  unitId: 'unit-recon2',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

describe('ReconciliationRepository.findMatchedLinesByWindow — real SQLite DB (C6b PR-2 Passo 8)', () => {
  let db: PrismaClient;
  let dbPath: string;
  const repo = new ReconciliationRepository();
  const asTx = () => db as unknown as Prisma.TransactionClient;
  const window = { from: new Date('2026-06-01T00:00:00.000Z'), to: new Date('2026-06-30T23:59:59.999Z') };

  beforeAll(async () => {
    dbPath = path.join(os.tmpdir(), `c6b-pr2-matched-${Date.now()}.db`);
    execSync('npx prisma migrate deploy', {
      cwd: SERVER_ROOT,
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: 'pipe',
    });
    db = new PrismaClient({ datasources: { db: { url: `file:${dbPath}?connection_limit=1` } } });
    await db.$connect();

    for (const [uid, unit] of [['u-recon2', 'unit-recon2'], ['u-other2', 'unit-other2']] as const) {
      await db.user.create({
        data: { id: uid, name: uid, username: uid, email: `${uid}@test.local`, password: 'x', role: 'USER' },
      });
      await db.account.create({
        data: { id: `acc-bank-${uid}`, userId: uid, unitId: unit, code: '1.1.01', name: 'Banco', nature: 'Asset', acceptsEntries: true },
      });
      await db.journalEntry.create({
        data: {
          id: `je-${uid}`, userId: uid, unitId: unit, date: new Date('2026-06-15T00:00:00.000Z'),
          description: 'Venda à vista', status: 'Posted', fiscalYear: 2026, entryNumber: 1,
        },
      });
      await db.posting.create({
        data: { id: `p-${uid}`, userId: uid, unitId: unit, entryId: `je-${uid}`, accountId: `acc-bank-${uid}`, debitCents: 15000, creditCents: 0 },
      });
      await db.bankStatement.create({
        data: {
          id: `st-${uid}`, userId: uid, unitId: unit, glAccountId: `acc-bank-${uid}`,
          periodStart: new Date('2026-06-01T00:00:00.000Z'), periodEnd: new Date('2026-06-30T00:00:00.000Z'), sha256: `hash-${uid}`,
        },
      });
      // l-in: MATCHED, inside the window. l-out: MATCHED, OUTSIDE the window (July).
      await db.bankStatementLine.create({
        data: { id: `l-in-${uid}`, userId: uid, unitId: unit, statementId: `st-${uid}`, lineNumber: 1, date: new Date('2026-06-15T00:00:00.000Z'), amountCents: 15000, description: 'linha casada', status: 'MATCHED', rawJson: '[]' },
      });
      await db.bankStatementLine.create({
        data: { id: `l-out-${uid}`, userId: uid, unitId: unit, statementId: `st-${uid}`, lineNumber: 2, date: new Date('2026-07-05T00:00:00.000Z'), amountCents: 15000, description: 'linha casada fora da janela', status: 'MATCHED', rawJson: '[]' },
      });
      await db.reconciliationMatch.create({
        data: { id: `m-${uid}`, userId: uid, unitId: unit, statementLineId: `l-in-${uid}`, postingId: `p-${uid}`, matchType: 'AUTO' },
      });
      await db.reconciliationMatch.create({
        data: { id: `m-out-${uid}`, userId: uid, unitId: unit, statementLineId: `l-out-${uid}`, postingId: `p-${uid}`, matchType: 'AUTO' },
      });
    }
  }, 60000);

  afterAll(async () => {
    await db.$disconnect();
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(dbPath + suffix); } catch { /* ignore */ }
    }
  });

  it('devolve a linha MATCHED dentro da janela, com o código da conta bancária e o resumo do lançamento casado', async () => {
    const rows = await repo.findMatchedLinesByWindow(scope, ['acc-bank-u-recon2'], window, asTx());
    expect(rows).toHaveLength(1); // l-out (Julho) fica de fora da janela
    expect(rows[0]).toMatchObject({
      bankAccountCode: '1.1.01',
      statementId: 'st-u-recon2',
      amountCents: 15000,
      memo: 'linha casada',
      entryId: 'je-u-recon2',
      entryNumber: 1,
      matchType: 'AUTO',
    });
    expect(rows[0].lineDate).toEqual(new Date('2026-06-15T00:00:00.000Z'));
  });

  it('nunca vaza a linha casada de outro tenant (isolamento de escopo)', async () => {
    const rows = await repo.findMatchedLinesByWindow(scope, ['acc-bank-u-other2'], window, asTx());
    expect(rows).toEqual([]);
  });

  it('glAccountIds vazio → [] sem tocar o banco', async () => {
    const rows = await repo.findMatchedLinesByWindow(scope, [], window, asTx());
    expect(rows).toEqual([]);
  });
});
