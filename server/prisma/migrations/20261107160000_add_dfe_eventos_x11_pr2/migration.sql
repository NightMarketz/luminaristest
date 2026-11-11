-- BE-INCR-DFE-EVENTOS (nó X11, PR-2; BRIEF docs/accounting/BE-INCR-DFE-EVENTOS-brief.md §4 e emenda do PR-2, itens 18–19).
-- Duas colunas novas, nullable, sem default, sem FK, sem dado: documentos existentes ficam com NULL
-- (= "nenhum cancelamento em voo" / "evento que cancelou desconhecido", o caso de toda nota anterior a este PR).
--
-- Prólogo idempotente (memória `migracao-sqlite-nao-e-transacional`): SQLite não tem `ADD COLUMN IF NOT EXISTS`.
-- Cada ADD COLUMN é atômico; se o arquivo abortar entre as duas, a primeira fica e o replay morre em
-- "duplicate column" — estado intermediário = uma coluna nullable a mais, nenhum dado alterado.

-- AlterTable — FiscalDocument (item 19: cancelamento em voo; item 18: evento que cancelou, decisão do dono 07/11 Q2)
ALTER TABLE "fiscal_documents" ADD COLUMN "cancelRequestedAt" DATETIME;
ALTER TABLE "fiscal_documents" ADD COLUMN "cancelEvento" TEXT;
