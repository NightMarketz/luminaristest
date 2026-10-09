-- SIMPLES-PISO-ANEXO-XI bloco 1 (BRIEF §3 item 1, F-PI-1 a): tabela nova iss_beneficios_municipais. Aditiva, sem dado.
-- IF NOT EXISTS: retomável (memória migracao-sqlite-nao-e-transacional).

-- CreateTable
CREATE TABLE IF NOT EXISTS "iss_beneficios_municipais" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "codMun" TEXT NOT NULL,
    "cTribNacPrefixos" JSONB NOT NULL,
    "tipo" TEXT NOT NULL,
    "reducaoBpPorFaixa" JSONB,
    "legislacao" TEXT NOT NULL,
    "vigenteDesde" TEXT NOT NULL,
    "vigenteAte" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "iss_beneficios_municipais_userId_unitId_deletedAt_idx" ON "iss_beneficios_municipais"("userId", "unitId", "deletedAt");
