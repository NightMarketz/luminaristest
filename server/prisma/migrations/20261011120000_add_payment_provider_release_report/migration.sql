-- BE-INCR-PAYMENT-PROVIDER PR-3 (nó F5; BRIEF §4.1 "PR-3 — acréscimos" + G1/G5 de D-2026-10-10-F5-PR3-FORKS).
-- Só ADD COLUMN, nenhuma tabela nova nem migração de dado. Colunas com FK usam `ALTER TABLE ... ADD COLUMN ...
-- REFERENCES` (default NULL), como em `20261002120000_add_fiscal_profile_insumo_expense_account`: o RedefineTables
-- que o `prisma migrate diff` gera tem janela de perda de dado (DROP da original antes do RENAME) e o ALTER não tem.
-- Memória `migracao-sqlite-nao-e-transacional`: são 6 statements independentes; um abort no meio deixa parte das
-- colunas criadas e o retry morre em "duplicate column" — recuperação = aplicar à mão as linhas que faltam
-- (mesmo comportamento aceito nos precedentes de ADD COLUMN).
-- Ordem com a emenda 3.3 (S16): a 3.3 não está em main; quem mergear depois rebaseia a sua migração.

-- AlterTable — P3-7/P3-8: tarifa do provedor no item do F7
ALTER TABLE "bank_settlement_items" ADD COLUMN "feeCents" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "bank_settlement_items" ADD COLUMN "feeEntryId" TEXT;

-- AlterTable — P3-11: conta da tarifa por escopo
ALTER TABLE "accounting_scope_settings" ADD COLUMN "providerFeeExpenseAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable — P3-9 (F-PPB-3 a): conta de débito do recibo ProviderBalance
ALTER TABLE "receivable_receipts" ADD COLUMN "debitAccountId" TEXT;

-- AlterTable — G1: extrato mp_release ligado à PaymentAccount
ALTER TABLE "bank_statements" ADD COLUMN "paymentAccountId" TEXT REFERENCES "payment_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable — G5: ator do job mpReleaseReportFetch
ALTER TABLE "payment_accounts" ADD COLUMN "credentialSetById" TEXT;
