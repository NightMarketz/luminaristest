-- BE-INCR-NFE-COST-REGIME (no X6; F-X6-1..6 cedula 14/09, F-X6-7/8 -> a 2026-09-15). Migracao ADITIVA:
-- 1 CREATE TABLE (fiscal_profiles) + 1 ADD COLUMN nullable em payables (recoverableTaxLines, F-X6-8 a).
-- Prologo IF EXISTS (classe migracao-sqlite-nao-e-transacional) so para a tabela nova; o ADD COLUMN puro
-- (nullable, sem default) nao faz rebuild — linhas existentes ficam NULL (= sem credito, o que eram).
DROP INDEX IF EXISTS "fiscal_profiles_userId_unitId_key";
DROP TABLE IF EXISTS "fiscal_profiles";

-- CreateTable
CREATE TABLE "fiscal_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "regimeTributario" TEXT NOT NULL,
    "icmsContribuinte" BOOLEAN NOT NULL DEFAULT false,
    "pisCofinsRegime" TEXT NOT NULL,
    "pisCofinsCreditExcludesIcms" BOOLEAN NOT NULL DEFAULT true,
    "pisCofinsCreditIncludesIpi" BOOLEAN NOT NULL DEFAULT false,
    "pisCofinsCreditFromSimplesSupplier" BOOLEAN NOT NULL DEFAULT false,
    "icmsRecuperavelAccountId" TEXT,
    "pisCofinsRecuperavelAccountId" TEXT,
    "partnerAccountRef" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "fiscal_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_icmsRecuperavelAccountId_fkey" FOREIGN KEY ("icmsRecuperavelAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fiscal_profiles_pisCofinsRecuperavelAccountId_fkey" FOREIGN KEY ("pisCofinsRecuperavelAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_profiles_userId_unitId_key" ON "fiscal_profiles"("userId", "unitId");

-- AlterTable (ADD COLUMN puro, nullable)
ALTER TABLE "payables" ADD COLUMN "recoverableTaxLines" TEXT;
