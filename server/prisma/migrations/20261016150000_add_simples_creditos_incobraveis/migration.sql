-- BE-INCR-SIMPLES-CAIXA PR-3 (nó X14-CAIXA, item 20; F-CX-5 a): créditos incobráveis do registro de valores a receber
-- (Res. CGSN 140 art. 77 VI e §§ 5º–6º). Tabela nova, sem dado a migrar.

-- CreateTable
CREATE TABLE "simples_creditos_incobraveis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "valorCents" BIGINT NOT NULL,
    "meioCobranca" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "evidencia" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "simples_creditos_incobraveis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "simples_creditos_incobraveis_userId_unitId_saleId_idx" ON "simples_creditos_incobraveis"("userId", "unitId", "saleId");
