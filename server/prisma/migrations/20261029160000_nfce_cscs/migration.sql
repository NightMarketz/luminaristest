-- X10a PR-8 (BE-INCR-NFCE-EMENDA-1 §4; D-2026-10-29-X10A-PR7-9-FORKS decisão 3) — tabela NOVA nfce_cscs (CSC da NFC-e
-- por unidade e ambiente, cifrado com DFE_PSC_KEYS). Nenhuma tabela existente é tocada (S6 vacuoso). Prólogo DROP TABLE
-- IF EXISTS (memória migracao-sqlite-nao-e-transacional): a tabela é nova, então o DROP nunca apaga dado de produção.
DROP TABLE IF EXISTS "nfce_cscs";

-- CreateTable
CREATE TABLE "nfce_cscs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL,
    "cscId" TEXT NOT NULL,
    "cscCiphertext" BLOB,
    "keyVersion" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "nfce_cscs_userId_unitId_ambiente_idx" ON "nfce_cscs"("userId", "unitId", "ambiente");
