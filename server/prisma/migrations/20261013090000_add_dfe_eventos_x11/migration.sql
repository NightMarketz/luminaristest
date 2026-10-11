-- BE-INCR-DFE-EVENTOS (nó X11, PR-1; BRIEF docs/accounting/BE-INCR-DFE-EVENTOS-brief.md §4, itens 1, 2, 7, 11, 14).
-- Colunas novas, todas nullable, sem default, sem FK, sem dado: documentos e perfis existentes ficam com NULL
-- (= "prazo do município desconhecido" / "sem instante fiscal" — a janela sai toda null, item 3).
--
-- Prólogo idempotente (memória `migracao-sqlite-nao-e-transacional`): SQLite não tem `ADD COLUMN IF NOT EXISTS`.
-- Cada ADD COLUMN é atômico; se o arquivo abortar no meio, as colunas de cima ficam e o replay morre em
-- "duplicate column" — estado intermediário = só colunas nullable a mais, nenhum dado alterado. O índice usa
-- DROP INDEX IF EXISTS antes do CREATE para o replay do último passo não falhar.

-- AlterTable — FiscalProfile (item 2, F-EVT-1 a)
ALTER TABLE "fiscal_profiles" ADD COLUMN "cancelPrazoDias" INTEGER;
ALTER TABLE "fiscal_profiles" ADD COLUMN "substPrazoDias" INTEGER;
ALTER TABLE "fiscal_profiles" ADD COLUMN "prazoFonte" TEXT;

-- AlterTable — FiscalDocument (itens 1, 7, 11, 14)
ALTER TABLE "fiscal_documents" ADD COLUMN "nfseDhProc" DATETIME;
ALTER TABLE "fiscal_documents" ADD COLUMN "substitutesDocumentId" TEXT;
ALTER TABLE "fiscal_documents" ADD COLUMN "substitutedByDocumentId" TEXT;
ALTER TABLE "fiscal_documents" ADD COLUMN "substMotivo" TEXT;
ALTER TABLE "fiscal_documents" ADD COLUMN "substReason" TEXT;
ALTER TABLE "fiscal_documents" ADD COLUMN "cancelEventAttachmentId" TEXT;

-- CreateIndex
DROP INDEX IF EXISTS "fiscal_documents_userId_unitId_substitutesDocumentId_idx";
CREATE INDEX "fiscal_documents_userId_unitId_substitutesDocumentId_idx" ON "fiscal_documents"("userId", "unitId", "substitutesDocumentId");
