/**
 * Database helpers for integration tests.
 *
 * All integration tests share one isolated SQLite file (test-integration.db, pointed at by
 * test/jest.setupEnv.ts). The integration Jest project runs --runInBand, so files never race on it.
 *  - pushTestSchema(): create the file fresh from schema.prisma (call once, in beforeAll).
 *  - resetDb():        wipe all rows between tests (call in afterEach) — FK-safe order.
 *  - disconnectDb():   close the Prisma connection (call in afterAll).
 */
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import prisma from '@/lib/prisma';

const SERVER_DIR = path.resolve(__dirname, '../..'); // test/helpers -> server
const DB_FILE = path.join(SERVER_DIR, 'prisma', 'test-integration.db');

/** Drops any existing test DB and recreates the schema via `prisma db push`. */
export function pushTestSchema(): void {
  for (const f of [DB_FILE, `${DB_FILE}-journal`]) {
    if (fs.existsSync(f)) fs.rmSync(f);
  }
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: SERVER_DIR,
    env: { ...process.env, DATABASE_URL: 'file:./test-integration.db' },
    stdio: 'inherit',
  });
}

/**
 * Deletes every row, children before parents, so tests start from a clean slate.
 *
 * Covers the accounting module (AccountingPeriod … AccountingBinding in schema.prisma) in
 * addition to the original 11 tables — F-Q3 (pipeline S3): resetDb() used to leave all ~31
 * accounting tables untouched, so accounting state leaked between test files under
 * --runInBand (see resetDb.accounting.integration.test.ts and
 * ProvenanceAttachIdempotency.integration.test.ts:90-101). Order below is a hardcoded FK-safe
 * topological sort (children before parents) derived from schema.prisma; the two self-relations
 * (JournalEntry.reversedById, DimensionValue.parentId) are nulled out just before their table's
 * deleteMany() so a single-table self-referencing pair never trips SQLite's FK check mid-delete.
 */
export async function resetDb(): Promise<void> {
  // Accounting — leaf tables first (nothing else references them).
  await prisma.postingDimension.deleteMany();
  await prisma.reconciliationMatch.deleteMany();
  await prisma.documentAttachment.deleteMany();
  await prisma.journalEntrySource.deleteMany();
  await prisma.accountingDataExchangeRow.deleteMany();
  await prisma.accountingPeriodTransition.deleteMany();
  await prisma.payablePayment.deleteMany();
  await prisma.receivableReceipt.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.referentialMapping.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.auditChainHead.deleteMany();
  await prisma.referentialAccount.deleteMany();
  await prisma.journalEntrySequence.deleteMany();
  await prisma.customerPackageBalance.deleteMany();
  await prisma.packageBalanceMovement.deleteMany();
  await prisma.accountingBinding.deleteMany();

  // Accounting — now safe: their own children are gone.
  await prisma.posting.deleteMany();
  await prisma.bankStatementLine.deleteMany();
  await prisma.dimensionValue.updateMany({ data: { parentId: null } }); // break self-relation
  await prisma.dimensionValue.deleteMany();
  await prisma.accountingDataExchangeJob.deleteMany();
  await prisma.sourceDocument.deleteMany();
  await prisma.accountingPeriod.deleteMany();
  await prisma.payable.deleteMany();
  await prisma.receivable.deleteMany();
  await prisma.inventoryItem.deleteMany();

  // Accounting — one more layer up.
  await prisma.journalEntry.updateMany({ data: { reversedById: null } }); // break self-relation
  await prisma.journalEntry.deleteMany();
  await prisma.bankStatement.deleteMany();
  await prisma.dimensionDefinition.deleteMany();
  await prisma.counterparty.deleteMany();

  // Accounting — root of the module's FK tree (only User still references it).
  await prisma.account.deleteMany();

  await prisma.dynamicTableData.deleteMany();
  await prisma.dynamicTable.deleteMany();
  await prisma.dashboardLayout.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatInstance.deleteMany();
  await prisma.structuredData.deleteMany();
  await prisma.chunk.deleteMany();
  await prisma.document.deleteMany();
  await prisma.actionProposal.deleteMany();
  await prisma.knowledgeGraph.deleteMany();
  await prisma.user.deleteMany();
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
