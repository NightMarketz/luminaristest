-- BE-INCR-SIMPLES-CAIXA PR-1 (nó X14-CAIXA, itens 1, 7 e 7a): recebimento da venda (base do DAS no regime de caixa,
-- Res. CGSN 140 art. 16 § 1º) e, no perfil fiscal da empresa, a data de efeitos da exclusão do Simples e o prazo D+N
-- do cartão. Só cria tabela e colunas anuláveis: as linhas existentes ficam com null. O backfill dos recebimentos é do
-- reconcile (item 4), não desta migração.

-- CreateTable
CREATE TABLE "receita_fiscal_recebimentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "dia" TEXT NOT NULL,
    "competenciaCaixa" TEXT NOT NULL,
    "valorCents" BIGINT NOT NULL,
    "meio" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "diaEstorno" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "receita_fiscal_recebimentos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "receita_fiscal_recebimentos_userId_unitId_competenciaCaixa_idx" ON "receita_fiscal_recebimentos"("userId", "unitId", "competenciaCaixa");

-- CreateIndex
CREATE UNIQUE INDEX "receita_fiscal_recebimentos_userId_unitId_saleId_origem_key" ON "receita_fiscal_recebimentos"("userId", "unitId", "saleId", "origem");

-- AlterTable
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "simplesExclusaoEfeitosEm" TEXT;
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "simplesCaixaPrazoCartaoDebitoDias" INTEGER;
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "simplesCaixaPrazoCartaoCreditoDias" INTEGER;
