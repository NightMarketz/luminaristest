-- BE-INCR-DFE-ANEXO-PENDENTE (BRIEF item 1, §4): pendência de anexo/proveniência da NFS-e autorizada em produção.
-- Migração só criativa, sem backfill de dados (o backfill do F-PA-7 b é por reconsulta, na varredura).
--
-- Prólogo idempotente (memória migracao-sqlite-nao-e-transacional): `migrate deploy` no SQLite não envolve o
-- arquivo numa transação; toda criação é IF NOT EXISTS, então reexecutar depois de um aborto converge.

-- CreateTable
CREATE TABLE IF NOT EXISTS "fiscal_document_pending_attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "xmlBytes" BLOB,
    "pdfBytes" BLOB,
    "xmlAttachmentId" TEXT,
    "pdfAttachmentId" TEXT,
    "sourceDocumentId" TEXT,
    "resultJson" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_document_pending_attachments_documentId_key" ON "fiscal_document_pending_attachments"("documentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fiscal_document_pending_attachments_status_nextAttemptAt_idx" ON "fiscal_document_pending_attachments"("status", "nextAttemptAt");
