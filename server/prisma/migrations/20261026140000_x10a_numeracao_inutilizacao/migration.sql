-- BE-INCR-NFCE PR-4 (nó X10a, itens 23–24; executa: dono, chat, 2026-10-26 "faz o X10a EMENDA-2 PR-1..PR-6 e EMENDA-3 (#757)").
-- (1) fiscal_document_sequences ganha "ambiente" na chave (F-NFCE-4 a: homologação e produção numeram cada uma de 1).
--     Tabela COM DADO: RedefineTables do Prisma; toda linha existente vai com ambiente = '' (BRIEF §4: a NFS-e segue sem
--     ambiente, lacuna no GAP-MAP). Abort no meio (SQLite não é transacional aqui — memória migracao-sqlite-nao-e-transacional):
--     se "new_fiscal_document_sequences" existir e "fiscal_document_sequences" também, apague a "new_" e rode de novo; se só a
--     "new_" existir, renomeie-a e `prisma migrate resolve --applied`.
-- (2) fiscal_number_voids (F-NFCE-5 a): tabela nova, vazia.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "new_fiscal_document_sequences";
CREATE TABLE "new_fiscal_document_sequences" (
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL DEFAULT '',
    "serie" INTEGER NOT NULL,
    "last" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("userId", "unitId", "kind", "ambiente", "serie")
);
INSERT INTO "new_fiscal_document_sequences" ("userId", "unitId", "kind", "ambiente", "serie", "last", "updatedAt")
SELECT "userId", "unitId", "kind", '', "serie", "last", "updatedAt" FROM "fiscal_document_sequences";
DROP TABLE "fiscal_document_sequences";
ALTER TABLE "new_fiscal_document_sequences" RENAME TO "fiscal_document_sequences";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE IF NOT EXISTS "fiscal_number_voids" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL,
    "serie" INTEGER NOT NULL,
    "nIni" BIGINT NOT NULL,
    "nFin" BIGINT NOT NULL,
    "ano" INTEGER NOT NULL,
    "xJust" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "partner" TEXT NOT NULL,
    "nProt" TEXT,
    "errorsJson" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fiscal_number_voids_userId_unitId_kind_ambiente_serie_idx" ON "fiscal_number_voids"("userId", "unitId", "kind", "ambiente", "serie");
