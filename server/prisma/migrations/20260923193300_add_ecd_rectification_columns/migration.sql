-- BE-INCR-FIXED-ASSETS PR-4 (nó C8, Bloco G — retificação versionada ECD/ECF, itens 26-31).
-- F-FA14 → (b) ratificado 2026-09-18 (execution-plan §1): migração POR PR. Esta é a migração
-- própria do PR-4 — 5 colunas aditivas em accounting_data_exchange_jobs, nenhuma FK (mesma
-- convenção de requestedById/committedById: id "plano", não FK — evita rebuild de tabela).
--
-- supersedesJobId: id do job ECD/ECF EXPORTED que este job substitui. UNIQUE — no máximo UM
-- sucessor por job original (item 21: 2º substituto do mesmo job → 409 via P2002 na unique).
-- ecfRectificationRequired: true quando este job é uma ECD substituta (0000.IND_FIN_ESC='1') —
-- trava o pacote ao contador (item 22) até uma ECF retificadora do mesmo ano ou dispensa.
-- ecfRectificationWaivedAt/WaiverReason: dispensa da exigência acima (item 22).
-- verificationTermStorageKey: caminho do .rtf do Termo de Verificação (J801.ARQ_RTF), salvo pelo
-- mesmo `attachmentStorage` reusado do restante do módulo — nunca no banco.
--
-- Memória migracao-sqlite-nao-e-transacional: ADD COLUMN não tem IF NOT EXISTS no SQLite; um
-- retry após aborto no meio destas 5 linhas falharia em "duplicate column" na coluna já
-- adicionada — comportamento aceito (mesmo padrão do PR-1, A3 do execution-plan): a tabela em si
-- já existe (nenhum CREATE TABLE aqui), então não há janela de "tabela pela metade".
ALTER TABLE "accounting_data_exchange_jobs" ADD COLUMN "supersedesJobId" TEXT;
ALTER TABLE "accounting_data_exchange_jobs" ADD COLUMN "ecfRectificationRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "accounting_data_exchange_jobs" ADD COLUMN "ecfRectificationWaivedAt" DATETIME;
ALTER TABLE "accounting_data_exchange_jobs" ADD COLUMN "ecfRectificationWaiverReason" TEXT;
ALTER TABLE "accounting_data_exchange_jobs" ADD COLUMN "verificationTermStorageKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "accounting_data_exchange_jobs_supersedesJobId_key" ON "accounting_data_exchange_jobs"("supersedesJobId");
