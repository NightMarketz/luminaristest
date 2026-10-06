-- BE-INCR-PIS-COFINS PR-3 (nó X8, item 17; L-5 decidida pelo dono 06/10): conta redutora de despesa (Expense) que é a
-- contrapartida dos outros créditos do não cumulativo (D PIS/COFINS a recuperar / C esta). Nullable, FK Restrict. Sem
-- migração de dado: as linhas existentes ficam NULL ("não configurado").
--
-- Uma coluna só, ADD COLUMN (precedente 20261005120000_add_pis_cofins_profile_accounts): sem RedefineTables (janela de
-- perda de dado). SQLite não tem `ADD COLUMN IF NOT EXISTS`; como é um único statement, não há meio-aplicado — o retry
-- depois de um abort antes dele roda limpo; depois dele, falha alta "duplicate column" e a recuperação é
-- `prisma migrate resolve --applied`.

-- AlterTable fiscal_profiles
ALTER TABLE "fiscal_profiles" ADD COLUMN "pisCofinsCreditoOutrosAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
