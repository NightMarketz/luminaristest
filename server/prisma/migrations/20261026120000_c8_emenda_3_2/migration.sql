-- C8 emenda 3.2 (BE-INCR-FIXED-ASSETS-EMENDA-3-2-brief.md §3.3; F-EM-13 → b: migração ÚNICA no P1, com as colunas
-- dos 3 PRs). Aditiva: uma tabela nova (F-EM-14 → a) e colunas no fim, sem RedefineTables.
--
-- Memória migracao-sqlite-nao-e-transacional: o arquivo não roda numa transação. A tabela e o índice vêm ANTES e são
-- idempotentes (IF NOT EXISTS); os `ADD COLUMN` (SQLite não tem IF NOT EXISTS) vêm depois, um por statement — um retry
-- após abort morre em "duplicate column" de forma óbvia, nunca em silêncio.
-- `lalur_entries.origem` NÃO entra: já existe desde a emenda 3.3 (20261013180000_encargos_descontos_emenda_3_3, LALUR_ORIGENS).

CREATE TABLE IF NOT EXISTS "lalur_entry_parte_b_links" (
    "entryId" TEXT NOT NULL,
    "parteBId" TEXT NOT NULL,
    "valorCents" BIGINT NOT NULL,

    PRIMARY KEY ("entryId", "parteBId"),
    CONSTRAINT "lalur_entry_parte_b_links_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "lalur_entries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "lalur_entry_parte_b_links_parteBId_fkey" FOREIGN KEY ("parteBId") REFERENCES "lalur_parte_b_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "lalur_entry_parte_b_links_parteBId_idx" ON "lalur_entry_parte_b_links"("parteBId");

ALTER TABLE "fixed_asset_classes" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'DEPRECIATION';
ALTER TABLE "fixed_asset_classes" ADD COLUMN "amortizationExpenseAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fixed_assets" ADD COLUMN "leaseEndDate" DATETIME;
ALTER TABLE "fixed_assets" ADD COLUMN "leaseIndemnifiable" BOOLEAN;
