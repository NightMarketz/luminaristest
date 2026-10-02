-- BE-INCR-ITEM-DESTINATION PR-1 (nó ITEM-DESTINATION; BRIEF item 2, F-ID-5 a): conta de despesa do insumo
-- do serviço por unidade. UMA coluna nullable com FK Restrict em fiscal_profiles; nenhuma outra tabela é
-- tocada (F-ID-3 a: sem ALTER em inventory_items/stock_movements/payables) e não há migração de dado (F-ID-7 a).
--
-- O `prisma migrate diff` gera RedefineTables (CREATE new_ / INSERT / DROP / RENAME) para coluna com FK no
-- SQLite. Trocado por UM `ALTER TABLE ... ADD COLUMN ... REFERENCES` — o SQLite aceita FK em ADD COLUMN
-- quando o default é NULL — porque o RedefineTables tem uma janela de PERDA DE DADO (abort entre o DROP da
-- original e o RENAME; review PR #368 em `20260923193300_add_ecd_rectification_columns`) e o ALTER não tem.
-- Memória `migracao-sqlite-nao-e-transacional`: o arquivo inteiro é UM statement, então não há estado
-- intermediário — ou a coluna existe, ou não. Retry após sucesso morre em "duplicate column", que é o
-- comportamento aceito nos precedentes de 1 coluna (`20260923200000_add_fixed_asset_source_item_ref`).
-- Conferido: `prisma migrate diff --from-url <cópia do dev.db migrada> --to-schema-datamodel` sai vazio.

-- AlterTable
ALTER TABLE "fiscal_profiles" ADD COLUMN "insumoExpenseAccountId" TEXT REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
