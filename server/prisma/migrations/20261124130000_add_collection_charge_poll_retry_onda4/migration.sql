-- Onda 4 / 4.3 (auditoria fiscal/contábil de 24/11/2026): o job `collection_charge_poll` re-consultava a cobrança PENDING
-- a cada tick mesmo quando o `getCharge` falhava sempre (4xx definitivo ou 5xx contínuo), sem espaçamento nem fim.
-- Cinco colunas novas em collection_charges, sem FK e sem dado a migrar: `pollAttempts` e `pollPermanentCount` (4xx definitivo
-- seguidos) com DEFAULT 0 (o caso de toda cobrança anterior: nenhuma falha seguida), `nextPollAt`, `pollGaveUpAt` e `pollLastError` nullable (NULL = "sem backoff",
-- "o job não desistiu", "sem erro").
--
-- Prólogo defensivo (memória `migracao-sqlite-nao-e-transacional`): SQLite não tem `ADD COLUMN IF NOT EXISTS` e não
-- reverte migração que aborta no meio. Cada ADD COLUMN é atômico; se o arquivo abortar entre eles, as colunas já criadas
-- ficam e o replay morre em "duplicate column" — estado intermediário = colunas a mais com valor neutro, nenhum dado
-- alterado; o remédio é `prisma migrate resolve` depois de conferir quais colunas existem (`PRAGMA table_info`).

-- AlterTable — CollectionCharge
ALTER TABLE "collection_charges" ADD COLUMN "pollAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "collection_charges" ADD COLUMN "pollPermanentCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "collection_charges" ADD COLUMN "nextPollAt" DATETIME;
ALTER TABLE "collection_charges" ADD COLUMN "pollGaveUpAt" DATETIME;
ALTER TABLE "collection_charges" ADD COLUMN "pollLastError" TEXT;
