-- BE-INCR-DP-F0-F1 PR-3 (nó PES-4, itens 28–33) — tabelas NOVAS dos cadastros de estrutura do DP: lotação, cargo,
-- jornada, sindicato, convenção coletiva e parâmetro da convenção. Nenhuma tabela existente é tocada. Prólogo
-- DROP TABLE IF EXISTS, filhos antes dos pais (memória migracao-sqlite-nao-e-transacional): as tabelas são novas, então
-- o DROP nunca apaga dado de produção.
DROP TABLE IF EXISTS "dp_convencao_parametros";
DROP TABLE IF EXISTS "dp_convencoes_coletivas";
DROP TABLE IF EXISTS "dp_sindicatos";
DROP TABLE IF EXISTS "dp_jornadas";
DROP TABLE IF EXISTS "dp_cargos";
DROP TABLE IF EXISTS "dp_lotacoes";

-- CreateTable
CREATE TABLE "dp_lotacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dp_lotacoes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dp_cargos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cbo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dp_cargos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dp_jornadas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "minutosSemanais" INTEGER NOT NULL,
    "tipoJornada" TEXT NOT NULL,
    "descricao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dp_jornadas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dp_sindicatos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dp_sindicatos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dp_convencoes_coletivas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sindicatoId" TEXT NOT NULL,
    "identificacao" TEXT NOT NULL,
    "vigenteDesde" TEXT NOT NULL,
    "vigenteAte" TEXT,
    "fonte" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dp_convencoes_coletivas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dp_convencoes_coletivas_sindicatoId_fkey" FOREIGN KEY ("sindicatoId") REFERENCES "dp_sindicatos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dp_convencao_parametros" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "convencaoId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "discriminador" TEXT,
    "valorInt" BIGINT NOT NULL,
    "clausula" TEXT NOT NULL,
    "vigenteDesde" TEXT NOT NULL,
    "vigenteAte" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dp_convencao_parametros_convencaoId_fkey" FOREIGN KEY ("convencaoId") REFERENCES "dp_convencoes_coletivas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "dp_lotacoes_userId_codigo_idx" ON "dp_lotacoes"("userId", "codigo");

-- CreateIndex
CREATE INDEX "dp_cargos_userId_idx" ON "dp_cargos"("userId");

-- CreateIndex
CREATE INDEX "dp_jornadas_userId_idx" ON "dp_jornadas"("userId");

-- CreateIndex
CREATE INDEX "dp_sindicatos_userId_cnpj_idx" ON "dp_sindicatos"("userId", "cnpj");

-- CreateIndex
CREATE INDEX "dp_convencoes_coletivas_userId_sindicatoId_idx" ON "dp_convencoes_coletivas"("userId", "sindicatoId");

-- CreateIndex
CREATE INDEX "dp_convencao_parametros_convencaoId_chave_idx" ON "dp_convencao_parametros"("convencaoId", "chave");

