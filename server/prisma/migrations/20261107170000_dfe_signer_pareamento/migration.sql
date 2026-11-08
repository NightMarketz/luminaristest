-- X10a EMENDA-4 AL-PR-2 (AL-3, AL-4, AL-12; executa: dono, chat, 2026-11-07 "Pode disparar então o que precisa seguir").
-- Três tabelas novas, sem dado: o assinador local pareado, os vínculos dele com as unidades e o código de pareamento.

-- CreateTable
CREATE TABLE "dfe_signer_devices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "certCnpj" TEXT NOT NULL,
    "certCnpjRaiz" TEXT NOT NULL,
    "certThumbprint" TEXT NOT NULL,
    "certNotAfter" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL,
    "versaoAssinador" TEXT NOT NULL,
    "tokenPresente" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "dfe_signer_device_units" (
    "deviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,

    PRIMARY KEY ("deviceId", "unitId"),
    CONSTRAINT "dfe_signer_device_units_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "dfe_signer_devices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dfe_signer_pairing_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "dfe_signer_devices_tokenHash_key" ON "dfe_signer_devices"("tokenHash");

-- CreateIndex
CREATE INDEX "dfe_signer_devices_userId_idx" ON "dfe_signer_devices"("userId");

-- CreateIndex
CREATE INDEX "dfe_signer_device_units_userId_unitId_idx" ON "dfe_signer_device_units"("userId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "dfe_signer_pairing_codes_codeHash_key" ON "dfe_signer_pairing_codes"("codeHash");

-- CreateIndex
CREATE INDEX "dfe_signer_pairing_codes_userId_unitId_idx" ON "dfe_signer_pairing_codes"("userId", "unitId");

