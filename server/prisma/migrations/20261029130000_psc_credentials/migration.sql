-- X10a PR-7 (EMENDA-PSC E-2..E-4; F-PSC-2 a, F-PSC-3 a) — tabelas NOVAS psc_providers, psc_credentials e
-- psc_authorizations. Nenhuma tabela existente é tocada (S6 vacuoso). Prólogo DROP TABLE IF EXISTS (memória
-- migracao-sqlite-nao-e-transacional): as tabelas são novas, então o DROP nunca apaga dado de produção.
DROP TABLE IF EXISTS "psc_providers";
DROP TABLE IF EXISTS "psc_credentials";
DROP TABLE IF EXISTS "psc_authorizations";

-- CreateTable
CREATE TABLE "psc_providers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretCipher" BLOB,
    "keyVersion" INTEGER,
    "cotaAnual" INTEGER,
    "lifetimeMaxSegundos" INTEGER,
    "algoritmos" TEXT NOT NULL,
    "habilitadoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "psc_credentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "pscProviderId" TEXT NOT NULL,
    "titularCnpj" TEXT NOT NULL,
    "certificadoPem" TEXT NOT NULL,
    "certNotAfter" TEXT NOT NULL,
    "accessTokenCiphertext" BLOB,
    "tokenExpiraEm" DATETIME NOT NULL,
    "keyVersion" INTEGER,
    "escopo" TEXT NOT NULL,
    "consumoNoAno" INTEGER NOT NULL DEFAULT 0,
    "consumoAno" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "psc_authorizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "pscProviderId" TEXT NOT NULL,
    "escopo" TEXT NOT NULL,
    "codeVerifierCiphertext" BLOB,
    "keyVersion" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "psc_credentials_userId_unitId_key" ON "psc_credentials"("userId", "unitId");

-- CreateIndex
CREATE INDEX "psc_authorizations_userId_unitId_idx" ON "psc_authorizations"("userId", "unitId");
