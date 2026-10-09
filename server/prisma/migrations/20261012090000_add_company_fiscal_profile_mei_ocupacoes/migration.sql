-- SIMPLES-PISO-ANEXO-XI item 12 (F-AX-2 a): ocupações do MEI declaradas no perfil (chaves de MEI_ANEXO_XI).
-- AlterTable
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "meiOcupacoes" JSONB;
