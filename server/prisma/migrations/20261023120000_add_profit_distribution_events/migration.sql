-- BE-INCR-IRRF-DISTRIBUICAO PR-2 (BRIEF itens 10–21; forks F-IRD-1..18 ratificados pelo dono em 2026-10-17; executa: dono,
-- chat, 2026-10-23, "Executa todas"). Aditiva: só a tabela nova `profit_distribution_events` (evento de distribuição de
-- lucros com IRRF). Sem dado.

-- CreateTable
CREATE TABLE IF NOT EXISTS "profit_distribution_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "dataEvento" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "debitoAccountId" TEXT NOT NULL,
    "contraAccountId" TEXT NOT NULL,
    "brutoCents" BIGINT NOT NULL,
    "irrfCents" BIGINT NOT NULL,
    "liquidoCents" BIGINT NOT NULL,
    "origemLucro" TEXT NOT NULL,
    "anoResultado" INTEGER,
    "aprovadoEm" TEXT,
    "atoSourceDocumentId" TEXT,
    "memoria" JSONB NOT NULL,
    "parametrosIds" JSONB NOT NULL,
    "parametrosSha256" TEXT NOT NULL,
    "avisoSaldoLucro" TEXT,
    "status" TEXT NOT NULL,
    "entryId" TEXT,
    "cancelledAt" DATETIME,
    "cancelledById" TEXT,
    "cancelReason" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "profit_distribution_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "profit_distribution_events_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "profit_distribution_events_userId_competencia_idx" ON "profit_distribution_events"("userId", "competencia");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "profit_distribution_events_userId_partnerId_competencia_idx" ON "profit_distribution_events"("userId", "partnerId", "competencia");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "profit_distribution_events_userId_taxId_competencia_idx" ON "profit_distribution_events"("userId", "taxId", "competencia");

