-- X14 PR-4 (F-PR4-13, dono 09/10): MEI transportador autônomo de cargas no perfil (Res. CGSN 140 art. 100 § 1º-A).
-- AlterTable
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "meiTransportadorCargas" BOOLEAN;
