-- Onda 4 / 4.1 (auditoria fiscal/contábil de 24/11/2026): o polling de documentos SENT|PROCESSING não tinha teto de
-- tentativas nem backoff — o documento cuja consulta falha era repetido a cada tick, sem fim.
-- Quatro colunas novas em fiscal_documents, todas sem FK e sem dado a migrar: `pollAttempts` com DEFAULT 0 (o caso de toda
-- nota anterior: nenhuma falha seguida), as demais nullable (NULL = "sem backoff", "não desistiu", "sem erro").
--
-- Prólogo defensivo (memória `migracao-sqlite-nao-e-transacional`): SQLite não tem `ADD COLUMN IF NOT EXISTS` e não
-- reverte migração que aborta no meio. Cada ADD COLUMN é atômico; se o arquivo abortar entre eles, as colunas já criadas
-- ficam e o replay morre em "duplicate column" — estado intermediário = colunas a mais com valor neutro, nenhum dado
-- alterado; o remédio é `prisma migrate resolve` depois de conferir quais colunas existem (`PRAGMA table_info`).

-- AlterTable — FiscalDocument
ALTER TABLE "fiscal_documents" ADD COLUMN "pollAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "fiscal_documents" ADD COLUMN "nextPollAt" DATETIME;
ALTER TABLE "fiscal_documents" ADD COLUMN "pollGaveUpAt" DATETIME;
ALTER TABLE "fiscal_documents" ADD COLUMN "pollLastError" TEXT;
