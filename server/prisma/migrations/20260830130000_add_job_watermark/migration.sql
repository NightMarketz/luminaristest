-- BRIEF-W2-F (F6) — trailing watermark for accountingSyncReconcile.job.ts, so it stops
-- re-scanning its whole lifetime source population every tick. Migração ADITIVA pura: 1 CREATE
-- TABLE, zero ALTER em tabela existente (mesmo formato de 20260709135422_add_referential_mapping /
-- 20260821090000_accounting_binding) — sem backfill/INSERT inicial: um `job` ausente é lido pelo
-- job como "escaneie tudo" (watermark = epoch), preservando o comportamento pré-migração até o
-- segundo tick sem precisar de dado semeado nesta migração.

-- F-W2F-3 (aceito pelo dono, 2026-08-30): a janela-com-overlap fecha o modo de falha de commit
-- atrasado sob contenção, MAS assume que nenhuma escrita externa a este processo (import direto
-- no banco, script administrativo, réplica futura) seta `updatedAt` para uma data ANTERIOR ao
-- watermark no momento em que a escrita se torna visível. Hoje isso é garantido pela AUSÊNCIA
-- de `$executeRaw` sobre `dynamic_table_data`, não por constraint de schema nesta tabela.

-- CreateTable
CREATE TABLE "job_watermarks" (
    "job" TEXT NOT NULL PRIMARY KEY,
    "watermarkAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
