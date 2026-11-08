-- BE-INCR-DP-F0-F1 PR-4 (nó PES-4, itens 37–49) — tabelas NOVAS do trabalhador, do vínculo e das versões do vínculo.
-- Nenhuma tabela existente é tocada. Prólogo DROP TABLE IF EXISTS, filhos antes dos pais (memória
-- migracao-sqlite-nao-e-transacional): as tabelas são novas, então o DROP nunca apaga dado de produção.
DROP TABLE IF EXISTS "dp_vinculo_versoes";
DROP TABLE IF EXISTS "dp_vinculos";
DROP TABLE IF EXISTS "dp_trabalhadores";

-- CreateTable
CREATE TABLE "dp_trabalhadores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nascimento" TEXT NOT NULL,
    "pcd" BOOLEAN NOT NULL DEFAULT false,
    "employeeRef" TEXT,
    "partnerId" TEXT,
    "origem" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dp_trabalhadores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dp_trabalhadores_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dp_vinculos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "trabalhadorId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "dataInicio" TEXT NOT NULL,
    "dataTermino" TEXT,
    "origem" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dp_vinculos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dp_vinculos_trabalhadorId_fkey" FOREIGN KEY ("trabalhadorId") REFERENCES "dp_trabalhadores" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dp_vinculo_versoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vinculoId" TEXT NOT NULL,
    "vigenteDesde" TEXT NOT NULL,
    "vigenteAte" TEXT,
    "lotacaoId" TEXT NOT NULL,
    "cargoId" TEXT,
    "jornadaId" TEXT,
    "sindicatoId" TEXT,
    "salarioCents" BIGINT NOT NULL,
    "unidadeSalario" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "dp_vinculo_versoes_vinculoId_fkey" FOREIGN KEY ("vinculoId") REFERENCES "dp_vinculos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dp_vinculo_versoes_lotacaoId_fkey" FOREIGN KEY ("lotacaoId") REFERENCES "dp_lotacoes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dp_vinculo_versoes_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "dp_cargos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dp_vinculo_versoes_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "dp_jornadas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dp_vinculo_versoes_sindicatoId_fkey" FOREIGN KEY ("sindicatoId") REFERENCES "dp_sindicatos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "dp_trabalhadores_userId_cpf_idx" ON "dp_trabalhadores"("userId", "cpf");

-- CreateIndex
CREATE INDEX "dp_vinculos_userId_unitId_idx" ON "dp_vinculos"("userId", "unitId");

-- CreateIndex
CREATE INDEX "dp_vinculo_versoes_vinculoId_vigenteDesde_idx" ON "dp_vinculo_versoes"("vinculoId", "vigenteDesde");

