-- BE-INCR-LEGAL-PARAMS PR-4 (nó LEGAL-PARAMS; BRIEF §3 itens 7 e 10; emenda §9 L-3, L-17..L-24, dono 07/10).
-- Só estrutura, nenhum backfill (apurações anteriores ficam com null nas colunas novas — o job só as avisa):
--   tax_assessments: parametrosIds/parametrosSha256 (snapshot das linhas de lei, item 7), entradaInformada (o payload
--   que o usuário informou, para o job reconfirmar), avisoParametroLegal (aviso visível, item 10);
--   legal_parameter_recalc_jobs: a fila do recálculo (publicar/revogar ⇒ PENDING; o agendador ⇒ DONE).

-- AlterTable
ALTER TABLE "tax_assessments" ADD COLUMN "avisoParametroLegal" TEXT;
ALTER TABLE "tax_assessments" ADD COLUMN "entradaInformada" JSONB;
ALTER TABLE "tax_assessments" ADD COLUMN "parametrosIds" JSONB;
ALTER TABLE "tax_assessments" ADD COLUMN "parametrosSha256" TEXT;

-- CreateTable
CREATE TABLE "legal_parameter_recalc_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legalParameterId" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimoErro" TEXT,
    "resumo" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "legal_parameter_recalc_jobs_status_createdAt_idx" ON "legal_parameter_recalc_jobs"("status", "createdAt");

