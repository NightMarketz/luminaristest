-- BE-INCR-CANCELAMENTO-CANCELLING PR-0 item 0.1 (ii): marca "alerta já enviado" da bandeja de pendências do reconcile.
-- O BLOCKED determinístico (9d3e) passa a ficar gravado e a alertar só na 1ª captura; sem esta coluna cada passada repetiria o
-- webhook. NULL = nenhum alerta enviado (todo item anterior). `resolvePending` a zera, para um reaparecimento alertar de novo.
--
-- Prólogo defensivo (memória `migracao-sqlite-nao-e-transacional`): 1 ADD COLUMN atômico, sem estado intermediário; replay
-- que morra em "duplicate column" = a coluna já existe (`PRAGMA table_info(reconcile_pending_items)`): `prisma migrate resolve --applied`.

-- AlterTable — ReconcilePendingItem
ALTER TABLE "reconcile_pending_items" ADD COLUMN "alertedAt" DATETIME;
