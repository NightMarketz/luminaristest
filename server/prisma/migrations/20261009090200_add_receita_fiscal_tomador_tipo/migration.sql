-- X14 PR-4 (F-PR4-9, dono 09/10): tipo do documento do tomador na linha do subrazão fiscal de receita.
-- As linhas existentes ficam NAO_IDENTIFICADO (não exigem NFS-e do MEI).
-- AlterTable
ALTER TABLE "receita_fiscal_linhas" ADD COLUMN "tomadorTipo" TEXT NOT NULL DEFAULT 'NAO_IDENTIFICADO';
