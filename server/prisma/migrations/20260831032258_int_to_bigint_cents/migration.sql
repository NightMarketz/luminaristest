/*
  Warnings:

  - You are about to alter the column `amountCents` on the `bank_statement_lines` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `closingBalanceCents` on the `bank_statements` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `openingBalanceCents` on the `bank_statements` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `balanceCents` on the `customer_package_balances` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `totalValueCents` on the `inventory_items` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `deltaCents` on the `package_balance_movements` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `amountCents` on the `payable_payments` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `amountCents` on the `payables` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `creditCents` on the `postings` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `debitCents` on the `postings` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `amountCents` on the `receivable_receipts` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `amountCents` on the `receivables` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `valueCentsDelta` on the `stock_movements` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bank_statement_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "externalRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "rawJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bank_statement_lines_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "bank_statements" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_bank_statement_lines" ("amountCents", "createdAt", "date", "description", "externalRef", "id", "lineNumber", "rawJson", "statementId", "status", "unitId", "updatedAt", "userId") SELECT "amountCents", "createdAt", "date", "description", "externalRef", "id", "lineNumber", "rawJson", "statementId", "status", "unitId", "updatedAt", "userId" FROM "bank_statement_lines";
DROP TABLE "bank_statement_lines";
ALTER TABLE "new_bank_statement_lines" RENAME TO "bank_statement_lines";
CREATE INDEX "bank_statement_lines_userId_unitId_statementId_status_idx" ON "bank_statement_lines"("userId", "unitId", "statementId", "status");
CREATE INDEX "bank_statement_lines_userId_unitId_date_idx" ON "bank_statement_lines"("userId", "unitId", "date");
CREATE UNIQUE INDEX "bank_statement_lines_statementId_lineNumber_key" ON "bank_statement_lines"("statementId", "lineNumber");
CREATE TABLE "new_bank_statements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "glAccountId" TEXT NOT NULL,
    "statementRef" TEXT,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "openingBalanceCents" BIGINT,
    "closingBalanceCents" BIGINT,
    "sha256" TEXT NOT NULL,
    "attachmentId" TEXT,
    "importedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "bank_statements_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_bank_statements" ("attachmentId", "closingBalanceCents", "createdAt", "deletedAt", "glAccountId", "id", "importedById", "openingBalanceCents", "periodEnd", "periodStart", "sha256", "statementRef", "unitId", "updatedAt", "userId") SELECT "attachmentId", "closingBalanceCents", "createdAt", "deletedAt", "glAccountId", "id", "importedById", "openingBalanceCents", "periodEnd", "periodStart", "sha256", "statementRef", "unitId", "updatedAt", "userId" FROM "bank_statements";
DROP TABLE "bank_statements";
ALTER TABLE "new_bank_statements" RENAME TO "bank_statements";
CREATE INDEX "bank_statements_userId_unitId_glAccountId_idx" ON "bank_statements"("userId", "unitId", "glAccountId");
CREATE INDEX "bank_statements_deletedAt_idx" ON "bank_statements"("deletedAt");
CREATE UNIQUE INDEX "bank_statements_userId_unitId_sha256_key" ON "bank_statements"("userId", "unitId", "sha256");
CREATE TABLE "new_customer_package_balances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "balanceCents" BIGINT NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "customer_package_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_customer_package_balances" ("balanceCents", "createdAt", "customerId", "deletedAt", "expiresAt", "id", "packageId", "unitId", "updatedAt", "userId") SELECT "balanceCents", "createdAt", "customerId", "deletedAt", "expiresAt", "id", "packageId", "unitId", "updatedAt", "userId" FROM "customer_package_balances";
DROP TABLE "customer_package_balances";
ALTER TABLE "new_customer_package_balances" RENAME TO "customer_package_balances";
CREATE INDEX "customer_package_balances_userId_unitId_idx" ON "customer_package_balances"("userId", "unitId");
CREATE INDEX "customer_package_balances_deletedAt_idx" ON "customer_package_balances"("deletedAt");
CREATE UNIQUE INDEX "customer_package_balances_userId_unitId_customerId_packageId_key" ON "customer_package_balances"("userId", "unitId", "customerId", "packageId");
CREATE TABLE "new_inventory_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "productRef" TEXT NOT NULL,
    "description" TEXT,
    "qtyOnHand" INTEGER NOT NULL DEFAULT 0,
    "totalValueCents" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "inventory_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_inventory_items" ("createdAt", "deletedAt", "description", "id", "productRef", "qtyOnHand", "status", "totalValueCents", "unitId", "updatedAt", "userId") SELECT "createdAt", "deletedAt", "description", "id", "productRef", "qtyOnHand", "status", "totalValueCents", "unitId", "updatedAt", "userId" FROM "inventory_items";
DROP TABLE "inventory_items";
ALTER TABLE "new_inventory_items" RENAME TO "inventory_items";
CREATE INDEX "inventory_items_userId_unitId_status_idx" ON "inventory_items"("userId", "unitId", "status");
CREATE UNIQUE INDEX "inventory_items_userId_unitId_productRef_key" ON "inventory_items"("userId", "unitId", "productRef");
CREATE TABLE "new_package_balance_movements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "deltaCents" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "package_balance_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_package_balance_movements" ("createdAt", "customerId", "deltaCents", "id", "kind", "packageId", "saleId", "unitId", "userId") SELECT "createdAt", "customerId", "deltaCents", "id", "kind", "packageId", "saleId", "unitId", "userId" FROM "package_balance_movements";
DROP TABLE "package_balance_movements";
ALTER TABLE "new_package_balance_movements" RENAME TO "package_balance_movements";
CREATE INDEX "package_balance_movements_userId_unitId_customerId_packageId_idx" ON "package_balance_movements"("userId", "unitId", "customerId", "packageId");
CREATE UNIQUE INDEX "package_balance_movements_userId_unitId_saleId_kind_key" ON "package_balance_movements"("userId", "unitId", "saleId", "kind");
CREATE TABLE "new_payable_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "payableId" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "method" TEXT NOT NULL,
    "paidAt" DATETIME NOT NULL,
    "paidByUserId" TEXT,
    "status" TEXT NOT NULL,
    "entryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payable_payments_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "payables" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_payable_payments" ("amountCents", "createdAt", "entryId", "id", "method", "paidAt", "paidByUserId", "payableId", "status", "unitId", "updatedAt", "userId") SELECT "amountCents", "createdAt", "entryId", "id", "method", "paidAt", "paidByUserId", "payableId", "status", "unitId", "updatedAt", "userId" FROM "payable_payments";
DROP TABLE "payable_payments";
ALTER TABLE "new_payable_payments" RENAME TO "payable_payments";
CREATE INDEX "payable_payments_userId_unitId_payableId_idx" ON "payable_payments"("userId", "unitId", "payableId");
CREATE TABLE "new_payables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierRef" TEXT,
    "documentNumber" TEXT,
    "description" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "expenseAccountId" TEXT,
    "inventoryProductRef" TEXT,
    "inventoryQty" INTEGER,
    "counterpartyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdById" TEXT,
    "cancelledById" TEXT,
    "cancelReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "payables_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payables_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payables_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "counterparties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_payables" ("amountCents", "cancelReason", "cancelledById", "counterpartyId", "createdAt", "createdById", "deletedAt", "description", "documentNumber", "dueDate", "expenseAccountId", "id", "inventoryProductRef", "inventoryQty", "issueDate", "status", "supplierName", "supplierRef", "unitId", "updatedAt", "userId") SELECT "amountCents", "cancelReason", "cancelledById", "counterpartyId", "createdAt", "createdById", "deletedAt", "description", "documentNumber", "dueDate", "expenseAccountId", "id", "inventoryProductRef", "inventoryQty", "issueDate", "status", "supplierName", "supplierRef", "unitId", "updatedAt", "userId" FROM "payables";
DROP TABLE "payables";
ALTER TABLE "new_payables" RENAME TO "payables";
CREATE INDEX "payables_userId_unitId_status_idx" ON "payables"("userId", "unitId", "status");
CREATE INDEX "payables_userId_unitId_dueDate_idx" ON "payables"("userId", "unitId", "dueDate");
CREATE UNIQUE INDEX "payables_userId_unitId_supplierName_documentNumber_key" ON "payables"("userId", "unitId", "supplierName", "documentNumber");
CREATE TABLE "new_postings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debitCents" BIGINT NOT NULL DEFAULT 0,
    "creditCents" BIGINT NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME,
    CONSTRAINT "postings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "postings_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "journal_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "postings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_postings" ("accountId", "createdAt", "creditCents", "debitCents", "entryId", "id", "unitId", "updatedAt", "userId") SELECT "accountId", "createdAt", "creditCents", "debitCents", "entryId", "id", "unitId", "updatedAt", "userId" FROM "postings";
DROP TABLE "postings";
ALTER TABLE "new_postings" RENAME TO "postings";
CREATE INDEX "postings_userId_unitId_idx" ON "postings"("userId", "unitId");
CREATE INDEX "postings_entryId_idx" ON "postings"("entryId");
CREATE INDEX "postings_accountId_idx" ON "postings"("accountId");
CREATE TABLE "new_receivable_receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "method" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL,
    "receivedByUserId" TEXT,
    "status" TEXT NOT NULL,
    "entryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "receivable_receipts_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "receivables" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_receivable_receipts" ("amountCents", "createdAt", "entryId", "id", "method", "receivableId", "receivedAt", "receivedByUserId", "status", "unitId", "updatedAt", "userId") SELECT "amountCents", "createdAt", "entryId", "id", "method", "receivableId", "receivedAt", "receivedByUserId", "status", "unitId", "updatedAt", "userId" FROM "receivable_receipts";
DROP TABLE "receivable_receipts";
ALTER TABLE "new_receivable_receipts" RENAME TO "receivable_receipts";
CREATE INDEX "receivable_receipts_userId_unitId_receivableId_idx" ON "receivable_receipts"("userId", "unitId", "receivableId");
CREATE TABLE "new_receivables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerRef" TEXT,
    "documentNumber" TEXT,
    "description" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "revenueAccountId" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdById" TEXT,
    "cancelledById" TEXT,
    "cancelReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "receivables_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "receivables_revenueAccountId_fkey" FOREIGN KEY ("revenueAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "receivables_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "counterparties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_receivables" ("amountCents", "cancelReason", "cancelledById", "counterpartyId", "createdAt", "createdById", "customerName", "customerRef", "deletedAt", "description", "documentNumber", "dueDate", "id", "issueDate", "revenueAccountId", "status", "unitId", "updatedAt", "userId") SELECT "amountCents", "cancelReason", "cancelledById", "counterpartyId", "createdAt", "createdById", "customerName", "customerRef", "deletedAt", "description", "documentNumber", "dueDate", "id", "issueDate", "revenueAccountId", "status", "unitId", "updatedAt", "userId" FROM "receivables";
DROP TABLE "receivables";
ALTER TABLE "new_receivables" RENAME TO "receivables";
CREATE INDEX "receivables_userId_unitId_status_idx" ON "receivables"("userId", "unitId", "status");
CREATE INDEX "receivables_userId_unitId_dueDate_idx" ON "receivables"("userId", "unitId", "dueDate");
CREATE UNIQUE INDEX "receivables_userId_unitId_customerName_documentNumber_key" ON "receivables"("userId", "unitId", "customerName", "documentNumber");
CREATE TABLE "new_stock_movements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryItemId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "qtyDelta" INTEGER NOT NULL,
    "valueCentsDelta" BIGINT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "entryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_stock_movements" ("createdAt", "entryId", "id", "inventoryItemId", "kind", "occurredAt", "qtyDelta", "sourceId", "sourceType", "valueCentsDelta") SELECT "createdAt", "entryId", "id", "inventoryItemId", "kind", "occurredAt", "qtyDelta", "sourceId", "sourceType", "valueCentsDelta" FROM "stock_movements";
DROP TABLE "stock_movements";
ALTER TABLE "new_stock_movements" RENAME TO "stock_movements";
CREATE INDEX "stock_movements_inventoryItemId_occurredAt_idx" ON "stock_movements"("inventoryItemId", "occurredAt");
CREATE UNIQUE INDEX "stock_movements_inventoryItemId_kind_sourceType_sourceId_key" ON "stock_movements"("inventoryItemId", "kind", "sourceType", "sourceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
