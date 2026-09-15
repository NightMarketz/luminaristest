-- BE-INCR-BANK-SETTLEMENT (no F7; F-F7-1..5 -> a, ratificados 2026-09-15) + AccountingScopeSettings
-- (decisao do dono 2026-09-15). Migracao ADITIVA: 2 CREATE TABLE, zero ALTER em tabela com dado.
-- Prologo IF EXISTS (classe migracao-sqlite-nao-e-transacional): um ABORT no meio deixa metade aplicada;
-- a 2a passada precisa poder recomecar do zero sem "table already exists".
DROP INDEX IF EXISTS "bank_settlement_items_userId_unitId_status_idx";
DROP INDEX IF EXISTS "bank_settlement_items_userId_unitId_statementLineId_idx";
DROP INDEX IF EXISTS "bank_settlement_items_userId_unitId_statementLineId_titleType_titleId_key";
DROP INDEX IF EXISTS "accounting_scope_settings_userId_unitId_key";
DROP TABLE IF EXISTS "bank_settlement_items";
DROP TABLE IF EXISTS "accounting_scope_settings";

-- CreateTable
CREATE TABLE "bank_settlement_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "statementLineId" TEXT NOT NULL,
    "titleType" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "proposedCents" BIGINT NOT NULL,
    "chargeCents" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "failedStep" TEXT,
    "settlementId" TEXT,
    "chargeEntryId" TEXT,
    "confirmedById" TEXT,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "bank_settlement_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bank_settlement_items_statementLineId_fkey" FOREIGN KEY ("statementLineId") REFERENCES "bank_statement_lines" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "accounting_scope_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "bankChargeExpenseAccountId" TEXT,
    "bankChargeIncomeAccountId" TEXT,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "accounting_scope_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "accounting_scope_settings_bankChargeExpenseAccountId_fkey" FOREIGN KEY ("bankChargeExpenseAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounting_scope_settings_bankChargeIncomeAccountId_fkey" FOREIGN KEY ("bankChargeIncomeAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "bank_settlement_items_userId_unitId_status_idx" ON "bank_settlement_items"("userId", "unitId", "status");

-- CreateIndex
CREATE INDEX "bank_settlement_items_userId_unitId_statementLineId_idx" ON "bank_settlement_items"("userId", "unitId", "statementLineId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_settlement_items_userId_unitId_statementLineId_titleType_titleId_key" ON "bank_settlement_items"("userId", "unitId", "statementLineId", "titleType", "titleId");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_scope_settings_userId_unitId_key" ON "accounting_scope_settings"("userId", "unitId");
