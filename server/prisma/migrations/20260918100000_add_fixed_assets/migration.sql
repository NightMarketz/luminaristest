-- BE-INCR-FIXED-ASSETS PR-1 (nó C8; BRIEF itens 1, 2, 3 (seed), 4 (tabela), 5 (colunas), 37;
-- F-FA10 → a ratificado 2026-09-16). F-FA14 → (b) ratificado 2026-09-18 (execution-plan §1): migração
-- POR PR — esta é a única migração do PR-1: as 3 tabelas novas + as 4 colunas de
-- accounting_scope_settings (item 5 + item 24, porque sob (b) o PR-2 e o PR-3 não abrem migração
-- própria). As 5 colunas de accounting_data_exchange_jobs (itens 6-7, retificação versionada) ficam
-- para a migração do PR-4, onde são de fato usadas.
--
-- Memória migracao-sqlite-nao-e-transacional: "prisma migrate deploy" não envolve o arquivo numa
-- transação no SQLite — um abort no meio deixa o que já rodou commitado. Ordem: primeiro o que é
-- idempotente (CREATE TABLE/INDEX IF NOT EXISTS — as 3 tabelas novas, vazias no dev.db real, S6
-- vacuoso), depois o rebuild de accounting_scope_settings (Prisma exige RedefineTables para
-- acrescentar coluna com FK — mesmo padrão de document_attachments em
-- 20260917200000_add_dfe_fiscal_documents_service_profiles; a tabela real tem no máximo 1 linha,
-- achado A10 do execution-plan). Prólogo IF EXISTS no new_ (review #348): abort entre o CREATE de
-- new_ e o DROP da velha deixaria new_ órfã e o retry morreria em "table already exists"; a tabela
-- velha ainda existe nessa janela, então dropar new_ não perde dado.

-- CreateTable: FixedAssetClass (BRIEF item 1; F-FA5 → a: LAND nasce depreciable=false, no serviço)
CREATE TABLE IF NOT EXISTS "fixed_asset_classes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "depreciable" BOOLEAN NOT NULL,
    "costAccountId" TEXT NOT NULL,
    "accumulatedDepreciationAccountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "fixed_asset_classes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fixed_asset_classes_costAccountId_fkey" FOREIGN KEY ("costAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fixed_asset_classes_accumulatedDepreciationAccountId_fkey" FOREIGN KEY ("accumulatedDepreciationAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "fixed_asset_classes_userId_unitId_idx" ON "fixed_asset_classes"("userId", "unitId");
CREATE INDEX IF NOT EXISTS "fixed_asset_classes_deletedAt_idx" ON "fixed_asset_classes"("deletedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "fixed_asset_classes_userId_unitId_code_key" ON "fixed_asset_classes"("userId", "unitId", "code");

-- CreateTable: DepreciationRate (BRIEF item 2; F-FA10 → a: chave = [userId,unitId,source,sourceRow];
-- CUSTOM tem sourceRow=null, e SQLite trata NULL como distinto no índice único — várias linhas
-- CUSTOM coexistem sem unique de negócio, como o BRIEF pede)
CREATE TABLE IF NOT EXISTS "depreciation_rates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "ncm" TEXT,
    "sourceRow" INTEGER,
    "description" TEXT NOT NULL,
    "lifeYears" INTEGER NOT NULL,
    "annualRateBp" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceSha256" TEXT,
    "justification" TEXT,
    "hiddenAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "depreciation_rates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "depreciation_rates_userId_unitId_idx" ON "depreciation_rates"("userId", "unitId");
CREATE INDEX IF NOT EXISTS "depreciation_rates_userId_unitId_hiddenAt_idx" ON "depreciation_rates"("userId", "unitId", "hiddenAt");
CREATE UNIQUE INDEX IF NOT EXISTS "depreciation_rates_userId_unitId_source_sourceRow_key" ON "depreciation_rates"("userId", "unitId", "source", "sourceRow");

-- CreateTable: FixedAsset (BRIEF item 4 — schema só; consumido a partir do PR-2). SEM `sourceItemRef`
-- (execution-plan Passo 28, achado da leitura pós-C6b): sob F-FA14 → (b) essa coluna é migração
-- aditiva PRÓPRIA do PR-5, quando o rascunho por NF-e (item 22) de fato precisar dela.
CREATE TABLE IF NOT EXISTS "fixed_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ncmPrefix" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "costCents" BIGINT NOT NULL,
    "residualValueCents" BIGINT NOT NULL DEFAULT 0,
    "rateId" TEXT,
    "annualRateBp" INTEGER NOT NULL,
    "bookAnnualRateBp" INTEGER,
    "bookRateJustification" TEXT,
    "openingAccumulatedCents" BIGINT NOT NULL DEFAULT 0,
    "accumulatedDepreciationCents" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "acquiredAt" DATETIME NOT NULL,
    "activatedAt" DATETIME,
    "disposedAt" DATETIME,
    "disposalEntryId" TEXT,
    "sourceDocumentId" TEXT,
    "payableId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "fixed_assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fixed_assets_classId_fkey" FOREIGN KEY ("classId") REFERENCES "fixed_asset_classes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fixed_assets_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "depreciation_rates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fixed_assets_disposalEntryId_fkey" FOREIGN KEY ("disposalEntryId") REFERENCES "journal_entries" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fixed_assets_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "source_documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fixed_assets_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "payables" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "fixed_assets_disposalEntryId_key" ON "fixed_assets"("disposalEntryId");
CREATE INDEX IF NOT EXISTS "fixed_assets_userId_unitId_status_idx" ON "fixed_assets"("userId", "unitId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "fixed_assets_userId_unitId_code_key" ON "fixed_assets"("userId", "unitId", "code");

-- RedefineTables: accounting_scope_settings ganha 4 colunas com FK (item 5: depreciationExpense/
-- disposalGain/disposalLossAccountId → accounts; item 24: depreciationParteBAccountId →
-- lalur_parte_b_accounts). SQLite não aceita ALTER TABLE ADD COLUMN com REFERENCES — rebuild
-- obrigatório (mesmo padrão de document_attachments).
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "new_accounting_scope_settings";
CREATE TABLE "new_accounting_scope_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "bankChargeExpenseAccountId" TEXT,
    "bankChargeIncomeAccountId" TEXT,
    "depreciationExpenseAccountId" TEXT,
    "disposalGainAccountId" TEXT,
    "disposalLossAccountId" TEXT,
    "depreciationParteBAccountId" TEXT,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "accounting_scope_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "accounting_scope_settings_bankChargeExpenseAccountId_fkey" FOREIGN KEY ("bankChargeExpenseAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounting_scope_settings_bankChargeIncomeAccountId_fkey" FOREIGN KEY ("bankChargeIncomeAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounting_scope_settings_depreciationExpenseAccountId_fkey" FOREIGN KEY ("depreciationExpenseAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounting_scope_settings_disposalGainAccountId_fkey" FOREIGN KEY ("disposalGainAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounting_scope_settings_disposalLossAccountId_fkey" FOREIGN KEY ("disposalLossAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounting_scope_settings_depreciationParteBAccountId_fkey" FOREIGN KEY ("depreciationParteBAccountId") REFERENCES "lalur_parte_b_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_accounting_scope_settings" ("bankChargeExpenseAccountId", "bankChargeIncomeAccountId", "createdAt", "id", "unitId", "updatedAt", "updatedById", "userId") SELECT "bankChargeExpenseAccountId", "bankChargeIncomeAccountId", "createdAt", "id", "unitId", "updatedAt", "updatedById", "userId" FROM "accounting_scope_settings";
DROP TABLE "accounting_scope_settings";
ALTER TABLE "new_accounting_scope_settings" RENAME TO "accounting_scope_settings";
CREATE UNIQUE INDEX "accounting_scope_settings_userId_unitId_key" ON "accounting_scope_settings"("userId", "unitId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
