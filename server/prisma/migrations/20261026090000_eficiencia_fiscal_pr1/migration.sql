-- EFICIENCIA-FISCAL PR-1 (BRIEF BE-INCR-EFICIENCIA-FISCAL §4.1): tabelas novas tax_optimization_policies,
-- service_cost_evidences e tax_optimization_suggestions. Aditiva, sem dado.
-- IF NOT EXISTS: retomável (memória migracao-sqlite-nao-e-transacional).

-- CreateTable
CREATE TABLE IF NOT EXISTS "tax_optimization_policies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "criterioAlocacao" TEXT NOT NULL DEFAULT 'PROPORCIONAL_CATALOGO',
    "pisoServico" TEXT NOT NULL DEFAULT 'CUSTO_INFORMADO',
    "aprovador" TEXT NOT NULL DEFAULT 'CONTADOR_SENAO_ADMIN',
    "severidadePisoProporcional" TEXT NOT NULL DEFAULT 'WARN',
    "vigenteDesde" TEXT NOT NULL,
    "vigenteAte" TEXT,
    "suggestionId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "service_cost_evidences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "serviceRef" TEXT NOT NULL,
    "custoCents" BIGINT,
    "catalogoMinimoCents" BIGINT,
    "sourceDocumentId" TEXT,
    "vigenteDesde" TEXT NOT NULL,
    "vigenteAte" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tax_optimization_suggestions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "practice" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pendingSlot" TEXT,
    "legalBasis" JSONB NOT NULL,
    "estimatedSavingCents" BIGINT NOT NULL,
    "calc" JSONB NOT NULL,
    "parametrosSha256" TEXT NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "decisionReason" TEXT,
    "supersedesId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tax_optimization_policies_userId_unitId_vigenteDesde_idx" ON "tax_optimization_policies"("userId", "unitId", "vigenteDesde");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "service_cost_evidences_userId_unitId_serviceRef_vigenteDesde_idx" ON "service_cost_evidences"("userId", "unitId", "serviceRef", "vigenteDesde");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tax_optimization_suggestions_userId_unitId_status_idx" ON "tax_optimization_suggestions"("userId", "unitId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tax_optimization_suggestions_userId_unitId_practice_subjectType_subjectId_pendingSlot_key" ON "tax_optimization_suggestions"("userId", "unitId", "practice", "subjectType", "subjectId", "pendingSlot");

