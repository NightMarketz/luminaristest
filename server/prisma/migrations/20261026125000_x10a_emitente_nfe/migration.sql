-- BE-INCR-NFCE PR-3 (nó X10a; executa: dono, chat, 2026-10-26 "faz o X10a EMENDA-2 PR-1..PR-6 e EMENDA-3"; questionário
-- da sessão de 26/10: emitente "Campos no FiscalProfile"). Razão social e endereço do emitente da NF-e/NFC-e (MOC 7.0
-- Anexo I C03, C06–C13). ALTER TABLE ... ADD COLUMN (aditivo, nulo, sem redefinir a tabela).
ALTER TABLE "fiscal_profiles" ADD COLUMN "razaoSocial" TEXT;
ALTER TABLE "fiscal_profiles" ADD COLUMN "enderLogradouro" TEXT;
ALTER TABLE "fiscal_profiles" ADD COLUMN "enderNumero" TEXT;
ALTER TABLE "fiscal_profiles" ADD COLUMN "enderComplemento" TEXT;
ALTER TABLE "fiscal_profiles" ADD COLUMN "enderBairro" TEXT;
ALTER TABLE "fiscal_profiles" ADD COLUMN "enderMunicipio" TEXT;
ALTER TABLE "fiscal_profiles" ADD COLUMN "enderCep" TEXT;
