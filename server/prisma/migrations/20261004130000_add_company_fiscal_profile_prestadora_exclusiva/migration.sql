-- BE-INCR-TAX-ASSESSMENT Fase B PR-1 (nó X7; BRIEF B item 3b, F-TB-5 b): coluna aditiva com default em
-- company_fiscal_profiles — a declaração de prestadora exclusiva de serviços (IN RFB 1.700/2017 art. 33 § 7º).
-- Sem migração de dado: as linhas existentes ficam com false, que é o "não declarou".
-- `ALTER TABLE ... ADD COLUMN` (não RedefineTables), mesmo motivo de 20261003120000_add_tax_assessment_profile_fields.

-- AlterTable company_fiscal_profiles
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "prestadoraExclusivaServicos" BOOLEAN NOT NULL DEFAULT false;
