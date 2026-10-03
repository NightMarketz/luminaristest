-- BE-INCR-TAX-ASSESSMENT Fase A PR-1 (nó X7; BRIEF itens 1, 2, 2b e 3): colunas aditivas e nullable (ou com
-- default) em company_fiscal_profiles (forma de apuração, trava, Real obrigatório×optante, atividade no ano,
-- chave da liminar LC 224) e em fiscal_profiles (4 contas da provisão, FK Restrict — F-TA-6 a). Sem migração
-- de dado: as linhas existentes ficam com NULL/false, que é o "não configurado" do BRIEF.
--
-- `prisma migrate diff` gera RedefineTables para as duas tabelas (FK em coluna nova no SQLite). Trocado por
-- `ALTER TABLE ... ADD COLUMN`, mesmo motivo do precedente `20261002120000_add_fiscal_profile_insumo_expense_account`:
-- o RedefineTables tem janela de PERDA DE DADO (abort entre o DROP da original e o RENAME); o ADD COLUMN não.
-- Janela que sobra (memória `migracao-sqlite-nao-e-transacional`): abort no meio deixa as primeiras colunas
-- criadas, e o retry morre em "duplicate column" na primeira delas — falha ALTA, sem perda. Recuperação:
-- conferir com `PRAGMA table_info` quais colunas existem, criar as que faltam e `prisma migrate resolve --applied`.

-- AlterTable company_fiscal_profiles
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "formaApuracaoIrpjCsll" TEXT;
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "formaApuracaoTravadaEm" DATETIME;
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "lucroRealObrigatorio" BOOLEAN;
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "inicioAtividadeEm" TEXT;
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "encerramentoAtividadeEm" TEXT;
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "lc224AcrescimoSuspenso" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "lc224LiminarReferencia" TEXT;

-- AlterTable fiscal_profiles
ALTER TABLE "fiscal_profiles" ADD COLUMN "irpjDespesaAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_profiles" ADD COLUMN "csllDespesaAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_profiles" ADD COLUMN "irpjRecolherAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fiscal_profiles" ADD COLUMN "csllRecolherAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
