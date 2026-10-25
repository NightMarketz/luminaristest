-- BE-INCR-RETENCOES-FONTE PR-2 (BRIEF itens 13, 14 e 19; F-RET-10 a, F-RET-11 a; executa: dono, chat, 2026-10-24: "executa
-- RETENCOES-FONTE PR-1 e PR-2"). Aditiva: tabela `tax_withholdings` (uma linha por tributo retido) e 2 colunas nullable em
-- `payables` (título de imposto: `origin` = 'WITHHOLDING_TAX' + `liabilityAccountId`, FK Restrict). `payable_payments.kind`
-- já existe (texto livre; o domínio `WITHHOLDING` é do código). `ALTER TABLE ... ADD COLUMN` em vez do RedefineTables
-- (precedente `20261021120000_add_partners_irrf_distribuicao`). Abort no meio: conferir com `PRAGMA table_info`, criar o que
-- falta e `prisma migrate resolve --applied` (memória migracao-sqlite-nao-e-transacional).

-- CreateTable
CREATE TABLE IF NOT EXISTS "tax_withholdings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "tributo" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "titleType" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "settlementId" TEXT,
    "originSettlementId" TEXT,
    "counterpartyId" TEXT NOT NULL,
    "naturezaServico" TEXT,
    "natRend" TEXT,
    "dataFatoGerador" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "brutoCents" BIGINT NOT NULL,
    "baseCents" BIGINT NOT NULL,
    "aliquotaBp" INTEGER,
    "amountCents" BIGINT NOT NULL,
    "dispensa" TEXT,
    "overrideMotivo" TEXT,
    "codigoReceita" TEXT,
    "taxPayableId" TEXT,
    "documentoNumero" TEXT,
    "documentoSerie" TEXT,
    "pfDetalhe" TEXT,
    "entryId" TEXT,
    "parametrosIds" TEXT NOT NULL,
    "parametrosSha256" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tax_withholdings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tax_withholdings_userId_unitId_competencia_direction_idx" ON "tax_withholdings"("userId", "unitId", "competencia", "direction");
CREATE INDEX IF NOT EXISTS "tax_withholdings_titleType_titleId_idx" ON "tax_withholdings"("titleType", "titleId");

-- AlterTable payables
ALTER TABLE "payables" ADD COLUMN "origin" TEXT;
ALTER TABLE "payables" ADD COLUMN "liabilityAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
