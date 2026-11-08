-- BE-INCR-DFE-EVENTOS (nó X11, PR-3; BRIEF docs/accounting/BE-INCR-DFE-EVENTOS-brief.md §3 item 20 e emenda do PR-3).
-- Status novo CANCEL_ANALYSIS (análise fiscal do cancelamento pendente, e101103) — `status` é TEXT, nada a migrar.
-- Uma coluna nova, nullable, sem default, sem FK, sem dado: documentos existentes ficam com NULL (= "não está em análise",
-- o caso de toda nota anterior a este PR). Decisão do dono 07/11 (questionário do PR-3, pergunta "Indeferido").
--
-- Prólogo idempotente (memória `migracao-sqlite-nao-e-transacional`): um único ADD COLUMN, atômico no SQLite. Abortar
-- antes dele = nada aplicado; depois = a coluna existe e a migração está completa. Não há estado intermediário.

-- AlterTable — FiscalDocument (status anterior ao CANCEL_ANALYSIS, restaurado quando o fisco indefere com e105105)
ALTER TABLE "fiscal_documents" ADD COLUMN "statusAntesAnalise" TEXT;
