-- BE-INCR-PARTIAL-SETTLEMENT (rodada 8 SDD; ADR-INCR-PARTIAL-SETTLEMENT F-PS1 c + F-PS5 a; BRIEF itens 1-2).
-- Saldo liquidado DENORMALIZADO no pai (cache do somatorio dos recibos ACTIVE) para o gate de soma
-- atomico (`UPDATE ... WHERE paidCents <= amountCentsLido - novo`) e a leitura barata de saldo.
-- `ADD COLUMN ... NOT NULL DEFAULT 0` e ADD COLUMN puro no SQLite (default constante) - sem rebuild.
ALTER TABLE "payables" ADD COLUMN "paidCents" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "receivables" ADD COLUMN "receivedCents" BIGINT NOT NULL DEFAULT 0;

-- Backfill (F-PS5 a) sobre dado que JA existe. Idempotente: a condicao `= 0` nao bate na 2a passada
-- (classe migracao-sqlite-nao-e-transacional). Titulos fechados no modelo full-only valem o total.
UPDATE "payables" SET "paidCents" = "amountCents" WHERE "status" = 'PAID' AND "paidCents" = 0;
UPDATE "receivables" SET "receivedCents" = "amountCents" WHERE "status" = 'RECEIVED' AND "receivedCents" = 0;

-- Linha em transito no momento da migracao (crash entre claim e finalize; reconcile converge): o recibo
-- ACTIVE ja existe e o finalize novo decide PAID x PARTIALLY_PAID pelo saldo - sem isto marcaria
-- PARTIALLY_PAID com saldo 0. E o invariante `paidCents == SUM(recibos ACTIVE)` (BRIEF item 14) aplicado.
UPDATE "payables" SET "paidCents" = (
  SELECT COALESCE(SUM(p."amountCents"), 0) FROM "payable_payments" p
  WHERE p."payableId" = "payables"."id" AND p."status" = 'ACTIVE'
) WHERE "status" = 'PAYING' AND "paidCents" = 0;
UPDATE "receivables" SET "receivedCents" = (
  SELECT COALESCE(SUM(r."amountCents"), 0) FROM "receivable_receipts" r
  WHERE r."receivableId" = "receivables"."id" AND r."status" = 'ACTIVE'
) WHERE "status" = 'RECEIVING' AND "receivedCents" = 0;
