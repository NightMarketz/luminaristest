-- BE-INCR-PIS-COFINS PR-1 (nó X8; BRIEF item 2, F-PCB-1 b): 4 contas da provisão de PIS/Cofins em fiscal_profiles,
-- nullable, FK Restrict. Sem migração de dado: as linhas existentes ficam com NULL ("não configurado").
--
-- ADD COLUMN em vez do RedefineTables do `prisma migrate diff`, pelo mesmo motivo do precedente
-- `20261003120000_add_tax_assessment_profile_fields`: o RedefineTables tem janela de perda de dado; o ADD COLUMN não.
-- Abort no meio deixa as primeiras colunas criadas e o retry morre em "duplicate column" (falha alta, sem perda).
-- Recuperação: `PRAGMA table_info("fiscal_profiles")`, criar as que faltam e `prisma migrate resolve --applied`.

-- AlterTable fiscal_profiles
ALTER TABLE "fiscal_profiles" ADD COLUMN "pisDespesaAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_profiles" ADD COLUMN "cofinsDespesaAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_profiles" ADD COLUMN "pisRecolherAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_profiles" ADD COLUMN "cofinsRecolherAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
