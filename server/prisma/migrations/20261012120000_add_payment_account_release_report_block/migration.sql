-- Review independente do #615 (F5 PR-3), achado A2 — R2 (a), dono, chat, 2026-10-10.
-- Não-nulo = o job mpReleaseReportFetch parou nesta conta (arquivo do MP sobrepõe extrato já importado) e só volta a
-- tentar depois que o operador destrava (POST /api/payment-accounts/:id/release-report/unblock).
--
-- Prólogo idempotente: SQLite não tem `ADD COLUMN IF NOT EXISTS` nem DDL condicional. A migração é UM único statement
-- (ADD COLUMN nullable, sem FK, sem default, sem dado) — o próprio statement é atômico, então não existe estado de
-- "metade aplicada" que um replay precise atravessar (memória `migracao-sqlite-nao-e-transacional`: o risco é entre
-- statements). Mesmo raciocínio dos precedentes de ADD COLUMN (ex.: 20261011120000).

-- AlterTable — A2: alerta de bloqueio do job do relatório de liberações
ALTER TABLE "payment_accounts" ADD COLUMN "releaseReportBlockedReason" TEXT;
