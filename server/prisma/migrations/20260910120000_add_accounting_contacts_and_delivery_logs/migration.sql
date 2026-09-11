-- BE-INCR-CONTADOR-DELIVERY (nó C6) — ADR-CONTADOR-DELIVERY (Accepted por delegação 2026-09-07;
-- DESCONDICIONADO do F-Z0 por sinal do dono em 2026-09-10). Migração ADITIVA pura: 2 CREATE TABLE,
-- ZERO ALTER em tabela existente — `accounting_data_exchange_jobs` só ganha relação REVERSA no
-- schema Prisma (F-CD4-a: o log referencia o job; a FK mora do lado do log). Sem backfill: as duas
-- tabelas nascem vazias (não há `AccountingContact`/`AccountingDeliveryLog` pré-existente).
--
-- Prólogo defensivo `DROP ... IF EXISTS` (memória `migracao-sqlite-nao-e-transacional`): SQLite não
-- roda migração em transação, então um ABORT no meio deixa a metade de cima aplicada e o replay
-- morre em "table already exists". Os DROPs só tocam as duas tabelas NOVAS desta migração — nunca
-- uma tabela com dado (o mesmo raciocínio das migrações anteriores da casa).
DROP TABLE IF EXISTS "accounting_delivery_logs";
DROP TABLE IF EXISTS "accounting_contacts";

-- CreateTable
CREATE TABLE "accounting_contacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    -- Registro profissional espelhando o J930 da ECD (Manual do Leiaute 9, ADE Cofis 01/2026):
    -- 06 IND_CRC, 09 UF_CRC, 10 NUM_SEQ_CRC (UF/AAAA/NÚMERO), 11 DT_CRC.
    "crcNumber" TEXT NOT NULL,
    "crcUf" TEXT NOT NULL,
    "crcCertificate" TEXT,
    "crcCertificateValidUntil" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "accounting_contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "accounting_contacts_userId_unitId_idx" ON "accounting_contacts"("userId", "unitId");

-- CreateIndex
CREATE INDEX "accounting_contacts_deletedAt_idx" ON "accounting_contacts"("deletedAt");

-- CreateTable
CREATE TABLE "accounting_delivery_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "ecdJobId" TEXT NOT NULL,
    "ecfJobId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "manifestSha256Ecd" TEXT NOT NULL,
    "manifestSha256Ecf" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "requestedById" TEXT NOT NULL,
    "sentAt" DATETIME,
    "failedAt" DATETIME,
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "accounting_delivery_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "accounting_delivery_logs_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "accounting_contacts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounting_delivery_logs_ecdJobId_fkey" FOREIGN KEY ("ecdJobId") REFERENCES "accounting_data_exchange_jobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounting_delivery_logs_ecfJobId_fkey" FOREIGN KEY ("ecfJobId") REFERENCES "accounting_data_exchange_jobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "accounting_delivery_logs_ecdJobId_ecfJobId_contactId_key" ON "accounting_delivery_logs"("ecdJobId", "ecfJobId", "contactId");

-- CreateIndex
CREATE INDEX "accounting_delivery_logs_userId_unitId_year_idx" ON "accounting_delivery_logs"("userId", "unitId", "year");
