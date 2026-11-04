-- BE-INCR-DP-F0-F1 PR-6 (nó PES-4, itens 56–58) — tabelas NOVAS do afastamento e da implantação de férias do vínculo.
-- Nenhuma tabela existente é tocada. Prólogo DROP TABLE IF EXISTS (memória migracao-sqlite-nao-e-transacional): as
-- tabelas são novas, então o DROP nunca apaga dado de produção.
DROP TABLE IF EXISTS "dp_afastamentos";
DROP TABLE IF EXISTS "dp_ferias_implantacoes";

-- CreateTable
CREATE TABLE "dp_afastamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vinculoId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "inicio" TEXT NOT NULL,
    "fim" TEXT,
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dp_afastamentos_vinculoId_fkey" FOREIGN KEY ("vinculoId") REFERENCES "dp_vinculos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dp_ferias_implantacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vinculoId" TEXT NOT NULL,
    "aquisitivoInicio" TEXT NOT NULL,
    "diasGozados" INTEGER NOT NULL,
    "fonte" TEXT NOT NULL,
    "informadoPorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dp_ferias_implantacoes_vinculoId_fkey" FOREIGN KEY ("vinculoId") REFERENCES "dp_vinculos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "dp_afastamentos_vinculoId_inicio_idx" ON "dp_afastamentos"("vinculoId", "inicio");

-- CreateIndex
CREATE INDEX "dp_ferias_implantacoes_vinculoId_idx" ON "dp_ferias_implantacoes"("vinculoId");

