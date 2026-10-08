-- BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14, itens 10–15). Aditiva: 2 colunas anuláveis em company_fiscal_profiles (opção
-- IBS/CBS por semestre, item 14) + 4 tabelas novas. Nenhum dado existente é reescrito (S6 do smoke vacuoso).

-- AlterTable
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "ibsCbsOpcaoS1" TEXT;
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "ibsCbsOpcaoS2" TEXT;

-- CreateTable
CREATE TABLE "simples_historico_mensal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "receitaBrutaCents" BIGINT NOT NULL,
    "folhaCents" BIGINT,
    "sourceDocumentId" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "simples_historico_mensal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "simples_segregacao_manual" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "parcelas" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "simples_segregacao_manual_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "salao_parceria_contratos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "profissionalContactId" TEXT NOT NULL,
    "cotaSalaoBp" INTEGER NOT NULL,
    "naturezaCota" TEXT NOT NULL,
    "homologadoEm" TEXT NOT NULL,
    "sindicato" TEXT NOT NULL,
    "vigenteDesde" TEXT NOT NULL,
    "vigenteAte" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "salao_parceria_contratos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "receita_fiscal_linhas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "dia" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "itemRef" TEXT NOT NULL,
    "natureza" TEXT NOT NULL,
    "cTribNac" TEXT,
    "productRef" TEXT,
    "receitaCents" BIGINT NOT NULL,
    "excluir" JSONB NOT NULL,
    "parceriaContratoId" TEXT,
    "cotaProfissionalCents" BIGINT NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "receita_fiscal_linhas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "simples_historico_mensal_userId_unitId_competencia_key" ON "simples_historico_mensal"("userId", "unitId", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "simples_segregacao_manual_userId_unitId_competencia_key" ON "simples_segregacao_manual"("userId", "unitId", "competencia");

-- CreateIndex
CREATE INDEX "salao_parceria_contratos_userId_unitId_profissionalContactId_idx" ON "salao_parceria_contratos"("userId", "unitId", "profissionalContactId");

-- CreateIndex
CREATE INDEX "receita_fiscal_linhas_userId_unitId_competencia_idx" ON "receita_fiscal_linhas"("userId", "unitId", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "receita_fiscal_linhas_userId_unitId_saleId_itemRef_key" ON "receita_fiscal_linhas"("userId", "unitId", "saleId", "itemRef");

