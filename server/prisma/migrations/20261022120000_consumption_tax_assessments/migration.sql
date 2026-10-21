-- IBS-CBS-2027 PR-2 (BRIEF item 8, contrato §4.1; item 12): apuração mensal de IBS/CBS + contas "a recolher" no perfil
-- fiscal da unidade. Tabela NOVA e duas colunas nulas em fiscal_profiles — nenhum dado existente muda (S6 vacuoso).
-- Memória migracao-sqlite-nao-e-transacional: CREATE com IF NOT EXISTS (retomável).

-- AlterTable
ALTER TABLE "fiscal_profiles" ADD COLUMN "ibsRecolherAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_profiles" ADD COLUMN "cbsRecolherAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "consumption_tax_assessments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "anoCalendario" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "tributo" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "debitosCents" BIGINT NOT NULL,
    "creditosCents" BIGINT NOT NULL,
    "saldoCents" BIGINT NOT NULL,
    "memoria" JSONB NOT NULL,
    "parametrosIds" JSONB NOT NULL,
    "parametrosSha256" TEXT NOT NULL,
    "entradaInformada" JSONB,
    "avisoParametroLegal" TEXT,
    "status" TEXT NOT NULL,
    "supersedesId" TEXT,
    "provisaoEntryId" TEXT,
    "confirmedById" TEXT NOT NULL,
    "confirmedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "consumption_tax_assessments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "consumption_tax_assessments_userId_anoCalendario_mes_tributo_idx" ON "consumption_tax_assessments"("userId", "anoCalendario", "mes", "tributo");
