-- BE-INCR-CRM-REPORT-BUILDER PR-1 (nó CRM-RB; BRIEF item 20, §1.1). Tabela nova `ptax_rates` — global, append-only,
-- sem FK e sem dado inicial (o job a preenche).
--
-- Prólogo idempotente (memória migracao-sqlite-nao-e-transacional): `migrate deploy` no SQLite não envolve o arquivo
-- numa transação. Se abortar no meio, sobra a tabela sem o índice; reexecutar converge porque toda criação é IF NOT EXISTS.

-- CreateTable
CREATE TABLE IF NOT EXISTS "ptax_rates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "currency" TEXT NOT NULL,
    "rateDate" DATETIME NOT NULL,
    "buyRateE5" INTEGER NOT NULL,
    "sellRateE5" INTEGER NOT NULL,
    "quotedAt" DATETIME NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ptax_rates_currency_rateDate_key" ON "ptax_rates"("currency", "rateDate");
