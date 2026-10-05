-- FE-INCR-PACOTE-VALIDADE (F-JUR-4; BRIEF item 1, §4.1; F-FE-PV-2 c). Só tabela NOVA, append-only — nenhuma tabela
-- existente é tocada, então o S6 do smoke é vacuoso (memória smoke-gate-s6-x-migracao-de-dado). Sem FK: a prova não
-- some com o usuário (memória audit-log-no-fk-cascade). Memória migracao-sqlite-nao-e-transacional: tudo com
-- IF NOT EXISTS, e um abort no meio é retomável pelo retry.

-- CreateTable
CREATE TABLE IF NOT EXISTS "package_validity_acceptances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "saleDate" DATETIME NOT NULL,
    "validityDays" INTEGER NOT NULL,
    "expiresOn" DATETIME NOT NULL,
    "textVersion" TEXT NOT NULL,
    "textShown" TEXT NOT NULL,
    "textSha256" TEXT NOT NULL,
    "acceptedByUserId" TEXT NOT NULL,
    "acceptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "package_validity_acceptances_userId_unitId_customerId_idx" ON "package_validity_acceptances"("userId", "unitId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "package_validity_acceptances_userId_unitId_saleId_key" ON "package_validity_acceptances"("userId", "unitId", "saleId");
