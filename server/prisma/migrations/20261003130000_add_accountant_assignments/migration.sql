-- BE-INCR-ACCOUNTANT-GOVERNANCE (nó GOV-CONTADOR; BRIEF item 2, §4.3; F-GOV-2 a). Só tabela NOVA — nenhuma
-- tabela existente é tocada, então o S6 do smoke é vacuoso (memória smoke-gate-s6-x-migracao-de-dado).
-- Memória migracao-sqlite-nao-e-transacional: tudo com IF NOT EXISTS, e um abort no meio é retomável pelo retry.
-- Unicidade "no máximo 1 ACTIVE e 1 PENDING por escopo" = UNIQUE com coluna-slot anulável (NULL distinto no
-- SQLite; precedente accounting_reviews), não índice parcial.

-- CreateTable
CREATE TABLE IF NOT EXISTS "accountant_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "accountantUserId" TEXT NOT NULL,
    "accountingContactId" TEXT NOT NULL,
    "crcNumber" TEXT NOT NULL,
    "crcUf" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "activeSlot" TEXT,
    "pendingSlot" TEXT,
    "activeFrom" DATETIME,
    "activeUntil" DATETIME,
    "createdById" TEXT NOT NULL,
    "endedById" TEXT,
    "endReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "accountant_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accountant_assignments_accountantUserId_fkey" FOREIGN KEY ("accountantUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accountant_assignments_accountingContactId_fkey" FOREIGN KEY ("accountingContactId") REFERENCES "accounting_contacts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "accountant_assignments_accountantUserId_status_idx" ON "accountant_assignments"("accountantUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "accountant_assignments_userId_unitId_activeSlot_key" ON "accountant_assignments"("userId", "unitId", "activeSlot");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "accountant_assignments_userId_unitId_pendingSlot_key" ON "accountant_assignments"("userId", "unitId", "pendingSlot");

