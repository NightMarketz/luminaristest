-- BE-INCR-DT-VERSION-LEDGER item 1 (D-2026-10-17; executa: dono, chat, 2026-10-17). Versão do schema vigente
-- de cada tabela dinâmica; toda tabela existente começa em 1. Sem backfill de dado (F-DTV-3 a).
--
-- Memória `migracao-sqlite-nao-e-transacional`: SQLite não tem `ADD COLUMN IF NOT EXISTS`, então a coluna vai
-- num arquivo de UM statement (precedente `20261003130000_add_fiscal_profile_pacote_ctribnac`).

-- AlterTable
ALTER TABLE "dynamic_tables" ADD COLUMN "schemaVersion" INTEGER NOT NULL DEFAULT 1;
