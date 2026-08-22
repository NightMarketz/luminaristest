-- BE-INCR-BINDING-PRESS Fase 0 (item 1 do BRIEF) — ADR-P1-binding-press.md, F-P1-2(b).
-- Migração ADITIVA pura: 1 CREATE TABLE, zero ALTER em tabela existente (espelha o formato de
-- 20260709135422_add_referential_mapping — CreateTable + CreateIndex, sem backfill/rebuild porque
-- não há dado legado a migrar).

-- CreateTable
CREATE TABLE "accounting_bindings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "sectorKey" TEXT NOT NULL,
    "bindingVersion" INTEGER NOT NULL,
    "compiledAt" DATETIME NOT NULL,
    "compiledFromHash" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "accounting_bindings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "accounting_bindings_userId_unitId_sectorKey_bindingVersion_key" ON "accounting_bindings"("userId", "unitId", "sectorKey", "bindingVersion");

-- CreateIndex
CREATE INDEX "accounting_bindings_userId_unitId_sectorKey_status_idx" ON "accounting_bindings"("userId", "unitId", "sectorKey", "status");
