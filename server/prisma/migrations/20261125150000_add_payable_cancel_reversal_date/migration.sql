-- BE-INCR-CANCELAMENTO-CANCELLING PR-0 item 0.1 (i): `cancelPayable` passa a gravar a INTENÇÃO de cancelar (status CANCELLING)
-- ANTES do estorno no razão. A data do estorno que o usuário informou ('YYYY-MM-DD', dia escrito) só vivia no corpo da requisição;
-- a retomada (reconcile/job/novo clique) precisa dela. Texto, não DateTime: evita o recuo de um dia por ISO UTC
-- (memória `motor-grava-date-como-iso-utc-scopeday-recua-um-dia`). `status` é String (sem DDL para o estado novo).
-- Coluna nullable, sem backfill: NULL = título nunca esteve em CANCELLING.
--
-- Prólogo defensivo (memória `migracao-sqlite-nao-e-transacional`): ADD COLUMN é atômico; migração de 1 comando não tem
-- estado intermediário. Se o replay morrer em "duplicate column", a coluna já existe (`PRAGMA table_info(payables)`):
-- `prisma migrate resolve --applied`.

-- AlterTable — Payable
ALTER TABLE "payables" ADD COLUMN "cancelReversalDate" TEXT;
