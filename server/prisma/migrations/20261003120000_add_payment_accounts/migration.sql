-- BE-INCR-PAYMENT-PROVIDER PR-1 (nó F5; BRIEF P1-3) — tabela NOVA payment_accounts. Nenhuma tabela existente
-- é tocada: vazia no dev.db real, S6 vacuoso declarado (memória smoke-gate-s6-x-migracao-de-dado).
-- Prólogo DROP TABLE IF EXISTS (memória migracao-sqlite-nao-e-transacional): um abort no meio é retomável
-- pelo retry — a tabela é nova, então o DROP nunca apaga dado de produção.
DROP TABLE IF EXISTS "payment_accounts";

-- CreateTable
CREATE TABLE "payment_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "glAccountId" TEXT NOT NULL,
    "providerAccountRef" TEXT,
    "configJson" TEXT NOT NULL,
    "credentialCiphertext" BLOB,
    "credentialKeyVersion" INTEGER,
    "credentialSetAt" DATETIME,
    "credentialExpiresAt" DATETIME,
    "accessTokenLast4" TEXT,
    "status" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "payment_accounts_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "payment_accounts_userId_unitId_provider_status_idx" ON "payment_accounts"("userId", "unitId", "provider", "status");
