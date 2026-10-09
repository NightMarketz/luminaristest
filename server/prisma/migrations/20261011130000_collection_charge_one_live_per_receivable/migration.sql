-- BE-INCR-PAYMENT-PROVIDER (nó F5) — achado 3 do review independente do #609: uma cobrança VIVA por título.
-- "Viva" = exatamente o predicado de `CollectionChargeRepository.findLiveByReceivable`: status CREATING/PENDING e
-- deletedAt IS NULL. Coluna só `receivableId` (id globalmente único; o escopo userId/unitId vem junto com o título).
-- Fecha o TOCTOU de duas criações simultâneas que o pré-cheque dentro da tx não fecha sozinho; o serviço traduz o
-- P2002 para o mesmo 409 CHARGE_LIVE_EXISTS do caminho sequencial.
-- Índice parcial não cabe no schema.prisma: o `db push` dos testes não o cria (o teste-guarda aplica este arquivo) e
-- um `prisma migrate diff` futuro vai propor DROP deste índice — não aceite.
-- Migração SQLite não é transacional: é um statement só, idempotente por IF NOT EXISTS; se falhar por dado duplicado
-- nada foi criado — resolva as duplicadas e reaplique.
-- Timestamp posterior a 20261011120000 de propósito: o índice depende da tabela criada em 20261010120000.
CREATE UNIQUE INDEX IF NOT EXISTS "collection_charges_one_live_per_receivable"
  ON "collection_charges" ("receivableId")
  WHERE "status" IN ('CREATING', 'PENDING') AND "deletedAt" IS NULL;
