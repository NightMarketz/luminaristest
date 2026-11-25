-- Lacuna 6e13 (dono, 25/11/2026): o episódio de adiamento do polling por transporte indisponível (início + "já alertei")
-- morava em texto no `pollLastError`; passa a ter colunas próprias. Duas colunas nullable em fiscal_documents, sem FK:
-- NULL = "sem episódio em andamento" / "ainda não alertou" — o caso de toda nota existente.
--
-- Sem backfill, por evidência: o formato em texto (`dfe_transporte_indisponivel desde=…`) nunca saiu do #1392 (não existe em
-- `main`), então nenhuma linha em ambiente real o carrega. Um episódio em curso numa base de desenvolvimento recomeça no
-- próximo adiamento (no máximo 1 alerta a mais, nunca perda de consulta).
--
-- Prólogo defensivo (memória `migracao-sqlite-nao-e-transacional`): SQLite não tem `ADD COLUMN IF NOT EXISTS` e não reverte
-- migração que aborta no meio. Cada ADD COLUMN é atômico; se o arquivo abortar entre eles, a coluna já criada fica e o replay
-- morre em "duplicate column" — estado intermediário = coluna a mais com valor neutro, nenhum dado alterado; o remédio é
-- `prisma migrate resolve` depois de conferir quais colunas existem (`PRAGMA table_info(fiscal_documents)`).

-- AlterTable — FiscalDocument
ALTER TABLE "fiscal_documents" ADD COLUMN "pollDeferredSince" DATETIME;
ALTER TABLE "fiscal_documents" ADD COLUMN "pollAlertedAt" DATETIME;
