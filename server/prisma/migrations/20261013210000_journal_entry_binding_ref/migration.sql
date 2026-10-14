-- BE-INCR-KIT-SETOR PR-6 (nó KIT-SETOR; BRIEF item 50; dono, chat, 2026-10-13: "Gravar a versão").
-- Duas colunas nullable em `journal_entries`: o binding que interpretou o evento. Linhas existentes ficam null
-- (o rastro delas devolve bindingVersion null). Sem backfill.
--
-- SQLite não tem `ADD COLUMN IF NOT EXISTS`; cada ALTER é um comando atômico. Se o arquivo abortar entre os dois,
-- reexecutar falha no primeiro — o remédio é aplicar só o segundo à mão (memória migracao-sqlite-nao-e-transacional).

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN "bindingId" TEXT;
ALTER TABLE "journal_entries" ADD COLUMN "bindingVersion" INTEGER;
