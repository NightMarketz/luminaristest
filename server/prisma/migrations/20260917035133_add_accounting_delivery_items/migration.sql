-- C6b PR-3 (BE-INCR-CONTADOR-PACKAGE-EXTENDED, Bloco A, Passos 1-2, F-C6b-1/2 a) -- migracao
-- ADITIVA: 1 coluna nova em tabela existente + 1 tabela nova + backfill dos pacotes ja
-- entregues. Memoria migracao-sqlite-nao-e-transacional: "prisma migrate deploy" nao envolve o
-- arquivo numa transacao no SQLite -- um abort no meio deixa o que ja rodou commitado. Toda
-- criacao leva "IF NOT EXISTS" para uma 2a passada (retry apos abort parcial) nao falhar por
-- "already exists"; o backfill usa "WHERE NOT EXISTS" pelo mesmo motivo (alem do
-- @@unique([deliveryId, jobId]) que tambem fecha o TOCTOU no banco).
--
-- ORDEM DELIBERADA (review #340 F1): "ALTER TABLE ... ADD COLUMN" NAO tem "IF NOT EXISTS" no
-- SQLite (a clausula so existe para CREATE TABLE/INDEX/VIEW/TRIGGER e DROP) -- reproduzido com
-- node --experimental-sqlite: um abort DEPOIS do ADD COLUMN faz o retry do script inteiro
-- estourar "duplicate column name: packageProfile" antes de chegar no CREATE TABLE/backfill
-- guardados. Por isso o ADD COLUMN de packageProfile fica POR ULTIMO, depois de tudo que e
-- idempotente (CREATE TABLE IF NOT EXISTS + backfill WHERE NOT EXISTS): um retry so pode
-- alcancar o ADD COLUMN depois que TUDO antes dele ja rodou (idempotentemente) de novo, e uma
-- vez que ele roda com sucesso nao ha mais nada depois para forcar outro retry por cima dele.
-- Mesmo padrao de 20260915140000_add_fiscal_profiles_and_payable_recoverable_tax_lines/migration.sql
-- (CREATE TABLE fiscal_profiles guardado por DROP IF EXISTS, ADD COLUMN payables.recoverableTaxLines
-- por ultimo, sem guarda).

-- CreateTable: AccountingDeliveryItem (F-C6b-1 a) -- generaliza os 2 arquivos fixos do
-- AccountingDeliveryLog (nucleo ECD/ECF) para N itens. As colunas fixas do log NAO somem --
-- continuam sendo o nucleo/chave de idempotencia; os itens sao a lista completa (nucleo em
-- position 0/1 + extras em 2..n).
CREATE TABLE IF NOT EXISTS "accounting_delivery_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "accounting_delivery_items_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "accounting_delivery_logs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounting_delivery_items_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "accounting_data_exchange_jobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "accounting_delivery_items_deliveryId_position_idx" ON "accounting_delivery_items"("deliveryId", "position");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "accounting_delivery_items_deliveryId_jobId_key" ON "accounting_delivery_items"("deliveryId", "jobId");

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- Backfill (Passo 2, F-C6b-1 a): cada AccountingDeliveryLog JA EXISTENTE ganha os 2 itens do
-- nucleo. O sha256 vem das colunas fixas do proprio log (nunca recomputado -- F-CD6-a). O kind
-- da ECD e fixo (resolveJobs so aceita EXPORT_SPED_ECD); o da ECF e lido por JOIN em
-- accounting_data_exchange_jobs porque a ECF tem 2 kinds possiveis (Presumido/Lucro Real).
-- "accounting_delivery_logs" esta VAZIA no dev.db real (BRIEF §5.3) -- este backfill so se prova
-- em fixture de teste de integracao; S6 do smoke:migration passa VACUAMENTE sobre o dado real
-- (nada a fazer, nada muda) -- declarado no PR (memoria smoke-gate-s6-x-migracao-de-dado).
-- Timestamps em INTEGER ms-epoch (mesmo padrao das migracoes anteriores com backfill de
-- Counterparty) para bater com o formato que o Prisma le de volta.
-- ─────────────────────────────────────────────────────────────────────────────────────────────

-- ECD -> position 0
INSERT INTO "accounting_delivery_items" ("id", "deliveryId", "jobId", "kind", "sha256", "position", "createdAt")
SELECT
    'adi_' || lower(hex(randomblob(12))),
    d."id",
    d."ecdJobId",
    'EXPORT_SPED_ECD',
    d."manifestSha256Ecd",
    0,
    (CAST(strftime('%s','now') AS INTEGER) * 1000)
FROM "accounting_delivery_logs" d
WHERE NOT EXISTS (
    SELECT 1 FROM "accounting_delivery_items" i
    WHERE i."deliveryId" = d."id" AND i."jobId" = d."ecdJobId"
);

-- ECF -> position 1 (kind lido do job de origem: EXPORT_SPED_ECF ou EXPORT_SPED_ECF_REAL)
INSERT INTO "accounting_delivery_items" ("id", "deliveryId", "jobId", "kind", "sha256", "position", "createdAt")
SELECT
    'adi_' || lower(hex(randomblob(12))),
    d."id",
    d."ecfJobId",
    j."kind",
    d."manifestSha256Ecf",
    1,
    (CAST(strftime('%s','now') AS INTEGER) * 1000)
FROM "accounting_delivery_logs" d
JOIN "accounting_data_exchange_jobs" j ON j."id" = d."ecfJobId"
WHERE NOT EXISTS (
    SELECT 1 FROM "accounting_delivery_items" i
    WHERE i."deliveryId" = d."id" AND i."jobId" = d."ecfJobId"
);

-- AlterTable: AccountingContact.packageProfile (F-C6b-2 a) -- perfil de pacote sugerido por
-- contato, Json? nullable sem default (SQLite nao reconstroi a tabela -- licao do
-- expenseAccountId). Nenhum contato existente ganha valor; GET devolve kinds:[] quando null.
-- POR ULTIMO de proposito (review #340 F1) -- ver comentario do cabecalho.
ALTER TABLE "accounting_contacts" ADD COLUMN "packageProfile" JSONB;
