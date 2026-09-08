-- BE-INCR-RECONCILE-PENDING (nó C7) — CEDULA-DECISAO-2026-09-03-modulos.md, linha
-- F-W2F-3/F-W2F-5 (RATIFICADO (b)); EMENDA de CEDULA-DECISAO-2026-08-31.md §B². Migração ADITIVA
-- pura: 1 CREATE TABLE, zero ALTER em tabela existente (mesmo formato de
-- 20260821090000_accounting_binding / 20260830130000_add_job_watermark) — sem backfill/INSERT
-- inicial: a tabela nasce vazia, o job passa a escrever nela a partir do primeiro tick pós-deploy.

-- CreateTable
CREATE TABLE "reconcile_pending_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "reasonDetail" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "reconcile_pending_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "reconcile_pending_items_userId_unitId_sourceType_sourceId_key" ON "reconcile_pending_items"("userId", "unitId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "reconcile_pending_items_userId_unitId_resolvedAt_idx" ON "reconcile_pending_items"("userId", "unitId", "resolvedAt");
