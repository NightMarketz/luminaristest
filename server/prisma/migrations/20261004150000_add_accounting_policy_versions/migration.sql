-- BE-INCR-ACCOUNTING-POLICY-VERSION (nó GOV-CONTADOR; BRIEF item 2, §4.3; F-POL-1 a). Só tabela NOVA — nenhuma
-- tabela existente é tocada, então o S6 do smoke é vacuoso (memória smoke-gate-s6-x-migracao-de-dado); F-POL-7 (a):
-- sem versão inicial, o histórico começa no deploy.
-- Memória migracao-sqlite-nao-e-transacional: tudo com IF NOT EXISTS, e um abort no meio é retomável pelo retry.
-- "No máximo 1 PROPOSED por (userId, unitId, target)" = UNIQUE com coluna-slot anulável (NULL distinto no SQLite;
-- precedente accountant_assignments), não índice parcial.

-- CreateTable
CREATE TABLE IF NOT EXISTS "accounting_policy_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "pendingSlot" TEXT,
    "payload" JSONB NOT NULL,
    "appliedSnapshot" JSONB,
    "proposedById" TEXT,
    "decidedById" TEXT,
    "assignmentId" TEXT,
    "decisionReason" TEXT,
    "decidedAt" DATETIME,
    "supersededById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "accounting_policy_versions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounting_policy_versions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "accountant_assignments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "accounting_policy_versions_userId_unitId_target_status_idx" ON "accounting_policy_versions"("userId", "unitId", "target", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "accounting_policy_versions_userId_unitId_target_version_key" ON "accounting_policy_versions"("userId", "unitId", "target", "version");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "accounting_policy_versions_userId_unitId_target_pendingSlot_key" ON "accounting_policy_versions"("userId", "unitId", "target", "pendingSlot");

