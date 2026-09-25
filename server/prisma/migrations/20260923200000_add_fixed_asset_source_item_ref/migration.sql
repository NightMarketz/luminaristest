-- BE-INCR-FIXED-ASSETS PR-5 (nó C8; execution-plan Passo 28; F-FA14 → b: migração aditiva PRÓPRIA
-- deste PR, decisão do dono 23/09). Coluna nullable sem FK — `ADD COLUMN` simples, sem RedefineTables
-- (mesma razão de `inventoryMultiItem`: não força rebuild no SQLite).
--
-- Memória migracao-sqlite-nao-e-transacional: "prisma migrate deploy" não envolve o arquivo numa
-- transação — um abort no meio deixa o que já rodou commitado. Prólogo IF EXISTS/IF NOT EXISTS só
-- se aplica ao que SUPORTA a cláusula (CREATE TABLE/INDEX); `ALTER TABLE ADD COLUMN` no SQLite não
-- tem `IF NOT EXISTS` — é o único ponto não-idempotente desta migração (mesmo padrão documentado em
-- 20260918100000_add_fixed_assets: fica isolado num statement próprio, sem nada depois que dependa
-- dele na MESMA migração, para que um retry após abort morra em "duplicate column" de forma óbvia,
-- nunca em silêncio). O índice único abaixo já é idempotente por natureza (`IF NOT EXISTS`).

ALTER TABLE "fixed_assets" ADD COLUMN "sourceItemRef" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "fixed_assets_payableId_sourceItemRef_key" ON "fixed_assets"("payableId", "sourceItemRef");
