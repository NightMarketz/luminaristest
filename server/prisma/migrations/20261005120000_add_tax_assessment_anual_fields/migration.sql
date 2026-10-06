-- X7 Fase B PR-3 (BRIEF B itens 11 e 16; F-TB-5 b, F-TB-3 a): colunas aditivas. `tax_assessments` ganha a diferença
-- postergada do 16% (default 0 — as linhas trimestrais existentes não têm diferença); `fiscal_profiles` ganha as 2
-- contas de saldo negativo a compensar do ajuste anual (FK Restrict, nullable = "não configurado", F-TA-7 a herdado).
-- Sem migração de dado.
--
-- `ALTER TABLE ... ADD COLUMN` em vez do RedefineTables do `prisma migrate diff`, mesmo motivo do precedente
-- `20261003120000_add_tax_assessment_profile_fields` (sem janela de perda de dado). Abort no meio deixa as primeiras
-- colunas criadas e o retry morre em "duplicate column": conferir com `PRAGMA table_info`, criar as que faltam e
-- `prisma migrate resolve --applied`.

-- AlterTable tax_assessments
ALTER TABLE "tax_assessments" ADD COLUMN "diferencaPostergadaCents" BIGINT NOT NULL DEFAULT 0;

-- AlterTable fiscal_profiles
ALTER TABLE "fiscal_profiles" ADD COLUMN "irpjSaldoNegativoAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_profiles" ADD COLUMN "csllSaldoNegativoAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
