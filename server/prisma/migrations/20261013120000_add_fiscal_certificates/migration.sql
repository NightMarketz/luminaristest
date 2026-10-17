-- BE-INCR-DFE-ADN-EMISSOR PR-1 (nó X10i; item 3) — tabela NOVA fiscal_certificates. Nenhuma tabela existente é
-- tocada: S6 vacuoso (memória smoke-gate-s6-x-migracao-de-dado). Prólogo DROP TABLE IF EXISTS (memória
-- migracao-sqlite-nao-e-transacional): a tabela é nova, então o DROP nunca apaga dado de produção.
DROP TABLE IF EXISTS "fiscal_certificates";

-- CreateTable
CREATE TABLE "fiscal_certificates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "keyCiphertext" BLOB,
    "certCiphertext" BLOB,
    "keyVersion" INTEGER,
    "cnpjCertificado" TEXT NOT NULL,
    "notBefore" TEXT NOT NULL,
    "notAfter" TEXT NOT NULL,
    "fingerprintSha256" TEXT NOT NULL,
    "setById" TEXT,
    "setAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_certificates_userId_unitId_key" ON "fiscal_certificates"("userId", "unitId");
