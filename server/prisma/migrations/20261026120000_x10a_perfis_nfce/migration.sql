-- BE-INCR-NFCE PR-2 (nó X10a, itens 8–10; executa: dono, chat, 2026-10-26 "faz o X10a EMENDA-2 PR-1..PR-6 e EMENDA-3").
-- (1) Emitente da NF-e/NFC-e: IE (emit/IE, C17) e séries por modelo (B07, 000–889) — F-NFCE-2 b: icmsContribuinte segue
-- significando crédito de ICMS na compra. ALTER TABLE ... ADD COLUMN (aditivo, sem redefinir a tabela).
ALTER TABLE "fiscal_profiles" ADD COLUMN "inscricaoEstadual" TEXT;
ALTER TABLE "fiscal_profiles" ADD COLUMN "nfeSerie" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "fiscal_profiles" ADD COLUMN "nfceSerie" INTEGER NOT NULL DEFAULT 1;

-- (2) Perfil fiscal do produto (F-NFCE-3 b: por produto, sem unitId). Tabela nova, vazia.
CREATE TABLE "product_fiscal_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productRef" TEXT NOT NULL,
    "ncm" TEXT NOT NULL,
    "cest" TEXT,
    "origem" INTEGER NOT NULL,
    "cfopPadrao" TEXT NOT NULL,
    "csosn" TEXT,
    "cstIcms" TEXT,
    "uCom" TEXT NOT NULL,
    "cEan" TEXT NOT NULL,
    "cstPis" TEXT NOT NULL,
    "cstCofins" TEXT NOT NULL,
    "ibsCbsCst" TEXT,
    "ibsCbsClassTrib" TEXT,
    "xProd" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
CREATE UNIQUE INDEX "product_fiscal_profiles_userId_productRef_key" ON "product_fiscal_profiles"("userId", "productRef");
