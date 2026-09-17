-- BE-INCR-DFE PR-1 (nó X10b; BRIEF itens 1-4; F-DFE-16 b, F-DFE-19 b ratificados 2026-09-17).
-- Memória migracao-sqlite-nao-e-transacional: "prisma migrate deploy" NÃO envolve o arquivo numa
-- transação no SQLite — um abort no meio deixa o que já rodou commitado. Ordem deliberada (mesmo
-- padrão de 20260917035133_add_accounting_delivery_items): primeiro o que é idempotente (CREATE
-- TABLE/INDEX IF NOT EXISTS), depois o rebuild de document_attachments (padrão RedefineTables do
-- Prisma, como 20260831032258_int_to_bigint_cents), e por ÚLTIMO os ADD COLUMN de fiscal_profiles —
-- "ALTER TABLE ... ADD COLUMN" não tem IF NOT EXISTS no SQLite, então um retry só os alcança depois
-- de tudo antes ter rodado de novo idempotentemente. ADD COLUMN puro (nullable ou NOT NULL DEFAULT
-- constante) NÃO faz rebuild: as linhas X6 existentes ganham o default (o dev.db real de 14/09 esta em 42/49 migracoes e sem fiscal_profiles — a prova byte-a-byte e a sonda sintetica do review #348, nao o smoke).

-- CreateTable: ServiceFiscalProfile (BRIEF item 2; F-DFE-6 a)
CREATE TABLE IF NOT EXISTS "service_fiscal_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "serviceRef" TEXT NOT NULL,
    "cTribNac" TEXT NOT NULL,
    "cTribMun" TEXT,
    "cNBS" TEXT,
    "cIndOp" TEXT NOT NULL DEFAULT '030101',
    "cLocPrestacao" TEXT,
    "xDescServ" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
CREATE UNIQUE INDEX IF NOT EXISTS "service_fiscal_profiles_userId_unitId_serviceRef_key" ON "service_fiscal_profiles"("userId", "unitId", "serviceRef");

-- CreateTable: FiscalDocument (BRIEF item 3; ADR-DFE D3 + §9.2; F-DFE-16 b => cTribNac no unique)
CREATE TABLE IF NOT EXISTS "fiscal_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "saleKey" TEXT NOT NULL,
    "cTribNac" TEXT NOT NULL DEFAULT '',
    "anchorEntryId" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL,
    "partner" TEXT NOT NULL,
    "partnerRef" TEXT,
    "serie" INTEGER NOT NULL,
    "numero" BIGINT,
    "nNFSe" TEXT,
    "chaveOuCodigo" TEXT,
    "dCompet" TEXT NOT NULL,
    "vServCents" BIGINT NOT NULL,
    "vDescIncondCents" BIGINT NOT NULL DEFAULT 0,
    "baseIssCents" BIGINT,
    "aliqIssBp" INTEGER,
    "vIssCents" BIGINT,
    "tpRetISSQN" INTEGER NOT NULL DEFAULT 1,
    "vIbsCents" BIGINT,
    "vCbsCents" BIGINT,
    "currentAttemptNo" INTEGER NOT NULL DEFAULT 1,
    "authorizedAt" DATETIME,
    "cancelledAt" DATETIME,
    "cancelMotivo" INTEGER,
    "cancelReason" TEXT,
    "errorsJson" TEXT,
    "xmlAttachmentId" TEXT,
    "pdfAttachmentId" TEXT,
    "sourceDocumentId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_documents_userId_unitId_saleKey_kind_cTribNac_key" ON "fiscal_documents"("userId", "unitId", "saleKey", "kind", "cTribNac");
CREATE INDEX IF NOT EXISTS "fiscal_documents_userId_unitId_status_idx" ON "fiscal_documents"("userId", "unitId", "status");
CREATE INDEX IF NOT EXISTS "fiscal_documents_userId_unitId_saleId_idx" ON "fiscal_documents"("userId", "unitId", "saleId");

-- CreateTable: FiscalDocumentAttempt (F-DFE-10 a — payload imutável por tentativa, ref único)
CREATE TABLE IF NOT EXISTS "fiscal_document_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL,
    "ref" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultStatus" TEXT,
    "resultJson" TEXT,
    CONSTRAINT "fiscal_document_attempts_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "fiscal_documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_document_attempts_ref_key" ON "fiscal_document_attempts"("ref");
CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_document_attempts_documentId_attemptNo_key" ON "fiscal_document_attempts"("documentId", "attemptNo");

-- CreateTable: FiscalDocumentSequence (BRIEF item 4 — ACC-015 por analogia; nunca a sequência do razão)
CREATE TABLE IF NOT EXISTS "fiscal_document_sequences" (
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "serie" INTEGER NOT NULL,
    "last" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("userId", "unitId", "kind", "serie")
);

-- RedefineTables: document_attachments perde a FK a journal_entries (F-DFE-19 b — dono, contra a
-- recomendação; risco aceito por escrito no BRIEF §4). Padrão RedefineTables do Prisma (mesmo de
-- 20260831032258_int_to_bigint_cents). Dado preservado coluna a coluna; índices recriados com o
-- MESMO nome (smoke S7 exige que nenhum índice nomeado desapareça).
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
-- Prologo IF EXISTS (review #348, MEDIO): abort entre o CREATE de new_ e o DROP da velha deixaria new_ orfa
-- e o retry morreria em "table already exists"; a tabela velha ainda existe nessa janela, entao dropar new_ nao perde dado.
DROP TABLE IF EXISTS "new_document_attachments";
CREATE TABLE "new_document_attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT 'JOURNAL_ENTRY',
    "targetId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT,
    "deletedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
INSERT INTO "new_document_attachments" ("createdAt", "deletedAt", "deletedById", "fileName", "fileSize", "id", "mimeType", "sha256", "storageKey", "targetId", "targetType", "unitId", "updatedAt", "uploadedById", "userId") SELECT "createdAt", "deletedAt", "deletedById", "fileName", "fileSize", "id", "mimeType", "sha256", "storageKey", "targetId", "targetType", "unitId", "updatedAt", "uploadedById", "userId" FROM "document_attachments";
DROP TABLE "document_attachments";
ALTER TABLE "new_document_attachments" RENAME TO "document_attachments";
CREATE INDEX "document_attachments_userId_unitId_targetType_targetId_idx" ON "document_attachments"("userId", "unitId", "targetType", "targetId");
CREATE INDEX "document_attachments_deletedAt_idx" ON "document_attachments"("deletedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- AlterTable: fiscal_profiles ADD COLUMN (BRIEF item 1 — emitente + D1f configurável). POR ÚLTIMO
-- (sem IF NOT EXISTS no SQLite). Nullable ou NOT NULL DEFAULT constante => sem rebuild.
ALTER TABLE "fiscal_profiles" ADD COLUMN "codMun" TEXT;
ALTER TABLE "fiscal_profiles" ADD COLUMN "inscricaoMunicipal" TEXT;
ALTER TABLE "fiscal_profiles" ADD COLUMN "cnae" TEXT;
ALTER TABLE "fiscal_profiles" ADD COLUMN "dpsSerie" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "fiscal_profiles" ADD COLUMN "regEspTrib" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "fiscal_profiles" ADD COLUMN "regApTribSN" INTEGER;
ALTER TABLE "fiscal_profiles" ADD COLUMN "issAliquotaBp" INTEGER;
ALTER TABLE "fiscal_profiles" ADD COLUMN "issRetidoTomadorPj" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "fiscal_profiles" ADD COLUMN "pacoteFatoGerador" TEXT NOT NULL DEFAULT 'CONSUMO';
ALTER TABLE "fiscal_profiles" ADD COLUMN "ibsCbsInformar" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "fiscal_profiles" ADD COLUMN "ibsCbsCst" TEXT;
ALTER TABLE "fiscal_profiles" ADD COLUMN "ibsCbsClassTrib" TEXT;
ALTER TABLE "fiscal_profiles" ADD COLUMN "pTotTribFedCent" INTEGER;
ALTER TABLE "fiscal_profiles" ADD COLUMN "pTotTribEstCent" INTEGER;
ALTER TABLE "fiscal_profiles" ADD COLUMN "pTotTribMunCent" INTEGER;
ALTER TABLE "fiscal_profiles" ADD COLUMN "pTotTribSNCent" INTEGER;
ALTER TABLE "fiscal_profiles" ADD COLUMN "emissaoForaDoMes" TEXT NOT NULL DEFAULT 'AVISAR';
ALTER TABLE "fiscal_profiles" ADD COLUMN "d1fConfirmado" BOOLEAN NOT NULL DEFAULT false;
