-- BE-INCR-FIXED-ASSETS PR-4 (nó C8, Bloco G — retificação versionada ECD/ECF, itens 26-31).
-- F-FA14 → (b) ratificado 2026-09-18 (execution-plan §1): migração POR PR. Esta é a migração
-- própria do PR-4 — 5 colunas aditivas em accounting_data_exchange_jobs, nenhuma FK (mesma
-- convenção de requestedById/committedById: id "plano", não FK).
--
-- Review PR #368: a 1ª versão desta migração usava `ALTER TABLE ... ADD COLUMN` sequencial (5
-- statements) — o padrão de `20260910180000_job_period_covered` (2 colunas) e de
-- `20260923200000_add_fixed_asset_source_item_ref` (1 coluna). Com 5 colunas em sequência, um
-- abort no meio deixa 1..4 já commitadas; um retry morre em "duplicate column" na 1ª (já
-- existente), o que É o comportamento aceito nos precedentes de 1-2 colunas — mas com 5 ele
-- some as colunas 3-5 se o operador destrancar o erro sem investigar. Troca para o padrão
-- RedefineTables (PRAGMA + tabela temporária) já usado em `20260918100000_add_fixed_assets`
-- para `accounting_scope_settings`: `DROP TABLE IF EXISTS "new_..."` como prólogo idempotente —
-- um retry após aborto no meio do rebuild (DROP do original já feito, RENAME ainda não) seria a
-- ÚNICA janela não-segura, e é a MESMA janela aceita nos precedentes (nunca fechada por completo
-- no SQLite sem uma transação real, que `prisma migrate deploy` não dá — memória
-- `migracao-sqlite-nao-e-transacional`). Tabela SEM FK própria (só um índice) — não precisa de
-- `PRAGMA foreign_keys=OFF` para si mesma, mas mantém-se por disciplina (filhas com FK
-- apontando para esta tabela, ex. `accounting_data_exchange_rows`, `accounting_delivery_items`,
-- `accounting_reviews`, `accounting_delivery_log`, continuam válidas: SQLite resolve FK por
-- NOME de tabela, não por referência interna — a tabela recriada com o mesmo nome as satisfaz).
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "new_accounting_data_exchange_jobs";
CREATE TABLE "new_accounting_data_exchange_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "sha256" TEXT,
    "storageKey" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "committedRows" INTEGER NOT NULL DEFAULT 0,
    "requestedById" TEXT NOT NULL,
    "committedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "committedAt" DATETIME,
    "periodStart" DATETIME,
    "periodEnd" DATETIME,
    "supersedesJobId" TEXT,
    "ecfRectificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "ecfRectificationWaivedAt" DATETIME,
    "ecfRectificationWaiverReason" TEXT,
    "verificationTermStorageKey" TEXT
);
INSERT INTO "new_accounting_data_exchange_jobs" (
  "id", "userId", "unitId", "direction", "kind", "status", "originalName", "mimeType",
  "sizeBytes", "sha256", "storageKey", "totalRows", "validRows", "invalidRows", "committedRows",
  "requestedById", "committedById", "createdAt", "updatedAt", "committedAt", "periodStart", "periodEnd"
)
SELECT
  "id", "userId", "unitId", "direction", "kind", "status", "originalName", "mimeType",
  "sizeBytes", "sha256", "storageKey", "totalRows", "validRows", "invalidRows", "committedRows",
  "requestedById", "committedById", "createdAt", "updatedAt", "committedAt", "periodStart", "periodEnd"
FROM "accounting_data_exchange_jobs";
DROP TABLE "accounting_data_exchange_jobs";
ALTER TABLE "new_accounting_data_exchange_jobs" RENAME TO "accounting_data_exchange_jobs";
CREATE INDEX IF NOT EXISTS "accounting_data_exchange_jobs_userId_unitId_createdAt_idx" ON "accounting_data_exchange_jobs"("userId", "unitId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "accounting_data_exchange_jobs_supersedesJobId_key" ON "accounting_data_exchange_jobs"("supersedesJobId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
