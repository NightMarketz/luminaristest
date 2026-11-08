-- BE-INCR-DP-F2 PR-1 (nó PES-4, BRIEF itens 13, 16 e 77; executa: dono, chat, 2026-11-06 "Executa o F2"). Três tabelas
-- novas, sem dado: dependente do trabalhador, lançamento informado e remuneração em outra empresa, com FK Restrict.

-- CreateTable
CREATE TABLE "dp_dependentes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trabalhadorId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "nascimento" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "deduzIrrf" BOOLEAN NOT NULL,
    "salarioFamilia" BOOLEAN NOT NULL,
    "invalido" BOOLEAN NOT NULL DEFAULT false,
    "vigenteDesde" TEXT NOT NULL,
    "vigenteAte" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dp_dependentes_trabalhadorId_fkey" FOREIGN KEY ("trabalhadorId") REFERENCES "dp_trabalhadores" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dp_lancamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vinculoId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "rubrica" TEXT NOT NULL,
    "quantidadeMin" INTEGER,
    "valorCents" BIGINT,
    "origem" TEXT NOT NULL,
    "moduloKey" TEXT,
    "observacao" TEXT,
    "informadoPorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dp_lancamentos_vinculoId_fkey" FOREIGN KEY ("vinculoId") REFERENCES "dp_vinculos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dp_outras_remuneracoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vinculoId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "remuneracaoCents" BIGINT NOT NULL,
    "contribuicaoCents" BIGINT NOT NULL,
    "ordem" TEXT NOT NULL,
    "categoriaOutraFonte" TEXT NOT NULL,
    "cnpjOutroEmpregador" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "informadoPorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dp_outras_remuneracoes_vinculoId_fkey" FOREIGN KEY ("vinculoId") REFERENCES "dp_vinculos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "dp_dependentes_trabalhadorId_idx" ON "dp_dependentes"("trabalhadorId");

-- CreateIndex
CREATE INDEX "dp_lancamentos_vinculoId_competencia_idx" ON "dp_lancamentos"("vinculoId", "competencia");

-- CreateIndex
CREATE INDEX "dp_outras_remuneracoes_vinculoId_competencia_idx" ON "dp_outras_remuneracoes"("vinculoId", "competencia");
