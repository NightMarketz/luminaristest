-- BE-INCR-CHAT-AGENT PR-3 (nó I11; BRIEF itens 12/15; F-I11-1 → a, F-I11-4 → b — dono, 2026-10-15/16).
-- Uso de tokens por mensagem do ASSISTANT. Só ADD COLUMN anulável, sem backfill: NULL = mensagem anterior ao
-- I11 ou de USER; 0 = turno do ASSISTANT sem chamada ao LLM (confirmação de proposta).
--
-- SQLite não tem `ADD COLUMN IF NOT EXISTS`; cada ALTER é atômico. Se o arquivo abortar no meio, reexecutar
-- falha no primeiro já aplicado — aplique à mão só os que faltam (memória migracao-sqlite-nao-e-transacional).

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "promptTokens" INTEGER;
ALTER TABLE "ChatMessage" ADD COLUMN "completionTokens" INTEGER;
ALTER TABLE "ChatMessage" ADD COLUMN "model" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "usageDetail" JSONB;
