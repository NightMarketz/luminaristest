-- BE-INCR-TAX-ASSESSMENT Fase A (nó X7; BRIEF item 12, F-X7-3 a). Só tabela NOVA — nenhuma tabela existente é
-- tocada, então o S6 do smoke é vacuoso (memória smoke-gate-s6-x-migracao-de-dado).
-- Memória migracao-sqlite-nao-e-transacional: tudo com IF NOT EXISTS (retry retomável).
-- "Um só CONFIRMED por (PJ, ano, tributo, período)" é gate dentro da tx do serviço, não UNIQUE.

-- CreateTable
CREATE TABLE IF NOT EXISTS "tax_assessments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "anoCalendario" INTEGER NOT NULL,
    "tributo" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "forma" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "modo" TEXT NOT NULL,
    "codigoReceita" TEXT NOT NULL,
    "baseCents" BIGINT NOT NULL,
    "devidoCents" BIGINT NOT NULL,
    "deducoesCents" BIGINT NOT NULL,
    "aPagarCents" BIGINT NOT NULL,
    "saldoNegativoCents" BIGINT NOT NULL DEFAULT 0,
    "memoria" JSONB NOT NULL,
    "tabelaVersao" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "supersedesId" TEXT,
    "provisaoEntryId" TEXT,
    "confirmedById" TEXT NOT NULL,
    "confirmedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "tax_assessments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tax_assessments_userId_anoCalendario_tributo_periodo_idx" ON "tax_assessments"("userId", "anoCalendario", "tributo", "periodo");
