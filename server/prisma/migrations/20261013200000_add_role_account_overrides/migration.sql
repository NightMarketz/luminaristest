-- BE-INCR-KIT-SETOR PR-3 (nó KIT-SETOR; BRIEF item 18, §3.2). Tabela nova `role_account_overrides` (ajuste
-- papel→conta do contador). Sem backfill: nenhuma unidade tem ajuste antes deste PR.
--
-- Prólogo idempotente (memória migracao-sqlite-nao-e-transacional): `migrate deploy` no SQLite não envolve o
-- arquivo numa transação; se abortar no meio, reexecutar converge porque toda criação é IF NOT EXISTS.

-- CreateTable
CREATE TABLE IF NOT EXISTS "role_account_overrides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "setById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "role_account_overrides_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "role_account_overrides_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "role_account_overrides_userId_unitId_role_idx" ON "role_account_overrides"("userId", "unitId", "role");
