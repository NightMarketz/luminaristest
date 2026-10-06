-- BE-INCR-PIS-COFINS PR-3 (nó X8, item 17; decisões do dono 06/10) — 3 contas da provisão de PIS/Cofins em
-- fiscal_profiles, nullable, FK Restrict. Sem migração de dado: as linhas existentes ficam NULL ("não configurado").
--   pisCofinsCreditoOutrosAccountId     (L-5)  redutora de despesa (Expense): D a recuperar / C esta, outros créditos
--   pisCofinsRetidoCompensarAccountId   (ret.) PIS/Cofins retido a compensar (Asset)
--   pisCofinsRetencaoConciliarAccountId (ret.) retenções a conciliar com clientes (Asset redutora): D retido / C esta
--
-- ADD COLUMN (precedente 20261005120000_add_pis_cofins_profile_accounts): sem RedefineTables (janela de perda de dado).
-- SQLite não tem `ADD COLUMN IF NOT EXISTS` nem DDL transacional garantido aqui: abort no meio deixa as primeiras
-- colunas criadas e o retry morre em "duplicate column" (falha alta, sem perda). Recuperação: `PRAGMA
-- table_info("fiscal_profiles")`, criar as que faltam e `prisma migrate resolve --applied`.

-- AlterTable fiscal_profiles
ALTER TABLE "fiscal_profiles" ADD COLUMN "pisCofinsCreditoOutrosAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_profiles" ADD COLUMN "pisCofinsRetidoCompensarAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_profiles" ADD COLUMN "pisCofinsRetencaoConciliarAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
