-- EFICIENCIA-FISCAL PR-5 (BRIEF itens 25, 26, 30): colunas aditivas, sem migração de dado.
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "sociedadeEmpresaria" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "alvaraSanitarioValidoAte" TEXT;
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "alvaraSourceDocumentId" TEXT;
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "declaraLocacaoImovelProprio" BOOLEAN;
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "declaraCessaoMaoDeObraMedica" BOOLEAN;
ALTER TABLE "service_fiscal_profiles" ADD COLUMN "finalidade" TEXT;
ALTER TABLE "service_fiscal_profiles" ADD COLUMN "elegivelHospitalar" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "service_fiscal_profiles" ADD COLUMN "fundamentoHospitalar" TEXT;
ALTER TABLE "receita_fiscal_linhas" ADD COLUMN "serviceRef" TEXT;
