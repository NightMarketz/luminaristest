-- BE-INCR-ENCARGOS-DESCONTOS, emenda 3.3, PR-1 (E5; F-ENC-10 b, dono 13/10): migração ÚNICA dos 4 PRs (BRIEF §4.3),
-- no precedente F-FA14 b / F-EM-13 b. Nenhum backfill: colunas novas com default; itens PENDING existentes ficam com
-- shortfallCents = 0 até o próximo scan, que os re-deriva (drift → STALE → PENDING).
-- Prólogo DROP TABLE IF EXISTS na tabela nova (memória migracao-sqlite-nao-e-transacional). ADD COLUMN não tem
-- IF NOT EXISTS no SQLite: abort depois de um ALTER exige remover as colunas já criadas antes do retry.
DROP TABLE IF EXISTS "bank_settlement_charge_parts";

-- CreateTable (E7: value-object do item, sem deletedAt; F-ENC-2 a)
CREATE TABLE "bank_settlement_charge_parts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "cents" BIGINT NOT NULL,
    CONSTRAINT "bank_settlement_charge_parts_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "bank_settlement_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "bank_settlement_charge_parts_itemId_kind_key" ON "bank_settlement_charge_parts"("itemId", "kind");

-- E11/E12 (PR-3): falta do pagamento e o tratamento dela
ALTER TABLE "bank_settlement_items" ADD COLUMN "shortfallCents" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "bank_settlement_items" ADD COLUMN "shortfallTreatment" TEXT;
ALTER TABLE "bank_settlement_items" ADD COLUMN "discountSettlementId" TEXT;
-- E13 (PR-3): linha de baixa que não é caixa
ALTER TABLE "payable_payments" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'PAYMENT';
ALTER TABLE "receivable_receipts" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'PAYMENT';
-- E15 (PR-4): mesma DDL proposta pelo BRIEF da emenda 3.2 (F-EM-9 a); a coluna ainda não existe em main
ALTER TABLE "lalur_entries" ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'user';
