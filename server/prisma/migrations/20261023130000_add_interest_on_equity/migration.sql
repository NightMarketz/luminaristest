-- BE-INCR-IRRF-DISTRIBUICAO PR-4 (BRIEF itens 27–31; forks F-IRD-1..18 ratificados em 2026-10-17; lacunas L-IRD-4..6 em
-- 2026-10-23; executa: dono, chat, 2026-10-23, "Executa todas"). Aditiva: só as tabelas novas do JCP. Sem dado.

-- CreateTable
CREATE TABLE IF NOT EXISTS "interest_on_equity_calculations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "anoCalendario" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "dataCredito" TEXT NOT NULL,
    "forma" TEXT NOT NULL,
    "debitoAccountId" TEXT NOT NULL,
    "memoria" JSONB NOT NULL,
    "jurosMaxTjlpCents" BIGINT NOT NULL,
    "limite50LucroCents" BIGINT NOT NULL,
    "limite50ReservasCents" BIGINT NOT NULL,
    "limiteDedutivelCents" BIGINT NOT NULL,
    "totalCents" BIGINT NOT NULL,
    "irrfCents" BIGINT NOT NULL,
    "liquidoCents" BIGINT NOT NULL,
    "excessoCents" BIGINT NOT NULL,
    "parametrosIds" JSONB NOT NULL,
    "parametrosSha256" TEXT NOT NULL,
    "previaSha256" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "vivoKey" TEXT NOT NULL,
    "entryId" TEXT,
    "lalurEntryIds" JSONB,
    "cancelledAt" DATETIME,
    "cancelledById" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "interest_on_equity_calculations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "interest_on_equity_allocations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calculationId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "participacaoBp" INTEGER NOT NULL,
    "brutoCents" BIGINT NOT NULL,
    "irrfCents" BIGINT NOT NULL,
    "liquidoCents" BIGINT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interest_on_equity_allocations_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "interest_on_equity_calculations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "interest_on_equity_allocations_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "interest_on_equity_calculations_userId_dataCredito_idx" ON "interest_on_equity_calculations"("userId", "dataCredito");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "interest_on_equity_calculations_userId_anoCalendario_periodo_vivoKey_key" ON "interest_on_equity_calculations"("userId", "anoCalendario", "periodo", "vivoKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "interest_on_equity_allocations_calculationId_idx" ON "interest_on_equity_allocations"("calculationId");

