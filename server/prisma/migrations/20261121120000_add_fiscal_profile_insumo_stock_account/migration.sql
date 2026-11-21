-- BE-INCR-INSUMO-INVENTARIO-PERIODICO item 1 (F-ID-3 c, dono 21/11/2026): conta de estoque de insumo do serviço por
-- unidade. UMA coluna nullable com FK Restrict em fiscal_profiles, sem migração de dado (nula = comportamento de antes,
-- despesa na entrada). Mesmo desenho de `20261002120000_add_fiscal_profile_insumo_expense_account`: um único
-- `ALTER TABLE ... ADD COLUMN ... REFERENCES` em vez do RedefineTables (que tem janela de perda de dado no SQLite).

-- AlterTable
ALTER TABLE "fiscal_profiles" ADD COLUMN "insumoStockAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
