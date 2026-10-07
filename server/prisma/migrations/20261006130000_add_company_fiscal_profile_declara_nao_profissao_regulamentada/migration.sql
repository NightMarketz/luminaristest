-- BE-INCR-TAX-PRESUMIDO-16 (F-P16-1 a, dono 06/10): coluna aditiva com default em company_fiscal_profiles — a
-- confirmação de que a PJ não é sociedade de profissão legalmente regulamentada nem prestadora de serviço hospitalar
-- ou de transporte (Lei 9.250/1995 art. 40 parágrafo único). Sem migração de dado: as linhas existentes ficam com
-- false, que é o "não confirmou".
-- `ALTER TABLE ... ADD COLUMN` (não RedefineTables), mesmo motivo de 20261003120000_add_tax_assessment_profile_fields.

-- AlterTable company_fiscal_profiles
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "declaraNaoProfissaoRegulamentada" BOOLEAN NOT NULL DEFAULT false;
