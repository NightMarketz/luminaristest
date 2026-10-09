-- BE-INCR-PAYMENT-PROVIDER PR-2 (nó F5; BRIEF §4.1, P2-2) — tabela NOVA collection_charges. Nenhuma tabela existente
-- é tocada: vazia no dev.db real, S6 vacuoso declarado (memória smoke-gate-s6-x-migracao-de-dado).
-- Prólogo DROP TABLE IF EXISTS (memória migracao-sqlite-nao-e-transacional): abort no meio é retomável pelo retry.
DROP TABLE IF EXISTS "collection_charges";

-- CreateTable
CREATE TABLE "collection_charges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "paymentAccountId" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "counterpartyId" TEXT,
    "kind" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "providerRef" TEXT,
    "providerPaymentRef" TEXT,
    "providerStatus" TEXT,
    "providerStatusDetail" TEXT,
    "status" TEXT NOT NULL,
    "paidAt" DATETIME,
    "payerSnapshotJson" TEXT NOT NULL,
    "instrumentJson" TEXT,
    "failReason" TEXT,
    "createdById" TEXT,
    "cancelledById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "collection_charges_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "payment_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "collection_charges_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "receivables" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "collection_charges_userId_unitId_receivableId_status_idx" ON "collection_charges"("userId", "unitId", "receivableId", "status");

-- CreateIndex
CREATE INDEX "collection_charges_userId_unitId_counterpartyId_createdAt_idx" ON "collection_charges"("userId", "unitId", "counterpartyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "collection_charges_paymentAccountId_providerRef_key" ON "collection_charges"("paymentAccountId", "providerRef");
