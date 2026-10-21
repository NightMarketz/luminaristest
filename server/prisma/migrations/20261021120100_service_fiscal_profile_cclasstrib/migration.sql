-- IBS-CBS-2027 PR-1 (BRIEF item 3; F-IBS-10 a): cClassTrib por serviço, com fallback para FiscalProfile.ibsCbsClassTrib.
-- Aditiva e nula: linhas existentes seguem usando o do perfil.
ALTER TABLE "service_fiscal_profiles" ADD COLUMN "cClassTrib" TEXT;
