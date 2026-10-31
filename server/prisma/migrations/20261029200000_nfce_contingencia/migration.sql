-- X10a PR-9 (E-9, F-NFCE-E1-5 b): contingência off-line da NFC-e — estado por unidade/ambiente, nota normal órfã e o
-- infNFeSupl da nota off-line. Só ADD COLUMN nullable e CREATE TABLE: nenhuma linha existente muda.
-- Prólogo DROP TABLE IF EXISTS (memória migracao-sqlite-nao-e-transacional): as tabelas são novas. O ADD COLUMN vai por
-- último: se ele falhar, a nova execução recria as tabelas e repete só ele.
DROP TABLE IF EXISTS "nfce_contingencias";
DROP TABLE IF EXISTS "nfce_contingencia_orfas";

-- CreateTable
CREATE TABLE "nfce_contingencias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT false,
    "origem" TEXT,
    "dhCont" DATETIME,
    "xJust" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "nfce_contingencia_orfas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL,
    "serie" INTEGER NOT NULL,
    "numero" BIGINT NOT NULL,
    "chave" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "voidId" TEXT,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimoErro" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "nfce_contingencias_userId_unitId_ambiente_key" ON "nfce_contingencias"("userId", "unitId", "ambiente");

-- CreateIndex
CREATE INDEX "nfce_contingencia_orfas_status_idx" ON "nfce_contingencia_orfas"("status");

-- CreateIndex
CREATE INDEX "nfce_contingencia_orfas_userId_unitId_documentId_idx" ON "nfce_contingencia_orfas"("userId", "unitId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "nfce_contingencia_orfas_documentId_numero_key" ON "nfce_contingencia_orfas"("documentId", "numero");

-- AlterTable
ALTER TABLE "fiscal_documents" ADD COLUMN "contingenciaSuplJson" TEXT;
