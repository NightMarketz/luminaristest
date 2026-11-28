-- BE-INCR-DP-F2 PR-4 (cédula D-2026-11-21-PES4-F2-PR3-PR4-LACUNAS, L1; decisão do dono de 07/11 sobre o tempo parcial).
-- Aditiva: duas colunas novas, sem reescrever tabela nem dado. SQLite não é transacional na migração (memória
-- migracao-sqlite-nao-e-transacional): cada ALTER é independente e idempotente na prática (falha só se a coluna existir).
ALTER TABLE "dp_lancamentos" ADD COLUMN "data" TEXT;
ALTER TABLE "dp_jornadas" ADD COLUMN "tempoParcial" BOOLEAN NOT NULL DEFAULT false;
