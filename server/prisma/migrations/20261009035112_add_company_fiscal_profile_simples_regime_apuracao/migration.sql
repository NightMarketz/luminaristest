-- X14 F-PR4-12 (b), dono 10/10 (D-2026-10-10-QUESTIONARIO-DONO Q3.1): regime de apuração da receita no Simples
-- (COMPETENCIA | CAIXA; Res. CGSN 140 art. 16). Linhas existentes = COMPETENCIA (o cálculo do X14 sempre foi por competência).
-- Um único comando: o SQLite aplica o ADD COLUMN inteiro ou nada — não há estado intermediário a tornar idempotente.
-- AlterTable
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "simplesRegimeApuracao" TEXT NOT NULL DEFAULT 'COMPETENCIA';
