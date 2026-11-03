-- EFICIENCIA-FISCAL PR-4 (BRIEF BE-INCR-EFICIENCIA-FISCAL itens 19–20; D-2026-10-28-EFICIENCIA-FISCAL-PR4-EXECUCAO #2 e #3).
-- Aditiva: três colunas anuláveis, sem default e sem backfill — linhas antigas ficam NULL ("não declarado").
ALTER TABLE "salao_parceria_contratos" ADD COLUMN "profissionalCnpj" TEXT;
ALTER TABLE "salao_parceria_contratos" ADD COLUMN "checklistDeclarado" JSONB;
ALTER TABLE "partners" ADD COLUMN "outrasParticipacoes" JSONB;
