-- X10a EMENDA-4 AL-PR-3 (AL-6, AL-7): fila servidor → assinador local. Tabela nova, sem dado a migrar.
-- CreateTable
CREATE TABLE "dfe_signer_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "documentId" TEXT,
    "tipo" TEXT NOT NULL,
    "payload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "leaseUntil" DATETIME,
    "resultHash" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "dfe_signer_tasks_deviceId_status_idx" ON "dfe_signer_tasks"("deviceId", "status");

-- CreateIndex
CREATE INDEX "dfe_signer_tasks_userId_unitId_idx" ON "dfe_signer_tasks"("userId", "unitId");
