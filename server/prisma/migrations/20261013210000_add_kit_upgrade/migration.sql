-- BE-INCR-KIT-SETOR PR-4 (nó KIT-SETOR; BRIEF itens 32–33, §3.2). Tabelas novas `kit_upgrade_runs` (execuções da
-- atualização do kit) e `kit_upgrade_pendings` (conflitos de nível c). Sem backfill: nenhuma atualização rodou antes.
--
-- Prólogo idempotente (memória migracao-sqlite-nao-e-transacional): `migrate deploy` no SQLite não envolve o
-- arquivo numa transação; se abortar no meio, reexecutar converge porque toda criação é IF NOT EXISTS.

-- CreateTable
CREATE TABLE IF NOT EXISTS "kit_upgrade_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "kitKey" TEXT NOT NULL,
    "fromVersion" INTEGER NOT NULL,
    "toVersion" INTEGER NOT NULL,
    "deployId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "report" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "kit_upgrade_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "kit_upgrade_pendings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "kitKey" TEXT NOT NULL,
    "toVersion" INTEGER NOT NULL,
    "runId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "kitValue" TEXT NOT NULL,
    "tenantValue" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "motivo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "kit_upgrade_pendings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "kit_upgrade_runs_userId_unitId_kitKey_toVersion_idx" ON "kit_upgrade_runs"("userId", "unitId", "kitKey", "toVersion");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "kit_upgrade_runs_deployId_idx" ON "kit_upgrade_runs"("deployId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "kit_upgrade_pendings_userId_unitId_status_idx" ON "kit_upgrade_pendings"("userId", "unitId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "kit_upgrade_pendings_userId_unitId_kitKey_toVersion_itemKey_key" ON "kit_upgrade_pendings"("userId", "unitId", "kitKey", "toVersion", "itemKey");
