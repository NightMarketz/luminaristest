-- BE-INCR-CRM-REPORT-BUILDER PR-2 (nó CRM-RB; BRIEF item 1). Tabela nova `crm_report_definitions`, sem dado inicial.
--
-- Prólogo idempotente (memória migracao-sqlite-nao-e-transacional): `migrate deploy` no SQLite não envolve o arquivo
-- numa transação. Se abortar no meio, sobra a tabela sem o índice; reexecutar converge porque toda criação é IF NOT EXISTS.

-- CreateTable
CREATE TABLE IF NOT EXISTS "crm_report_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" TEXT NOT NULL,
    "chartType" TEXT NOT NULL,
    "spec" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "crm_report_definitions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "crm_report_definitions_userId_idx" ON "crm_report_definitions"("userId");
