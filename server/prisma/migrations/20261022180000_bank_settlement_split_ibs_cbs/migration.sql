-- IBS-CBS-2027 PR-4 (BRIEF itens 19–20 + EMENDA PR-4, dono 22/10): split payment como tratamento da falta no F7.
-- Valores do IBS e da CBS retidos, competência do débito extinto e os ids dos recibos sem caixa (um por tributo).
-- Aditiva: ALTER TABLE ... ADD COLUMN com default, como nos PRs anteriores; linhas antigas ficam com split 0 / null.
ALTER TABLE "bank_settlement_items" ADD COLUMN "splitIbsCents" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "bank_settlement_items" ADD COLUMN "splitCbsCents" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "bank_settlement_items" ADD COLUMN "splitCompetencia" TEXT;
ALTER TABLE "bank_settlement_items" ADD COLUMN "splitIbsReceiptId" TEXT;
ALTER TABLE "bank_settlement_items" ADD COLUMN "splitCbsReceiptId" TEXT;
