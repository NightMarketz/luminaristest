-- BE-INCR-ITEM-DESTINATION PR-2 (nó ITEM-DESTINATION; BRIEF item 2, F-ID-2 a): destinação PADRÃO por produto e
-- unidade. Só uma tabela NOVA — nenhuma tabela existente é tocada (F-ID-3 a: sem ALTER em inventory_items,
-- stock_movements ou payables) e não há migração de dado (F-ID-7 a: produto sem default cai em FALLBACK = REVENDA).
-- Memória migracao-sqlite-nao-e-transacional: tudo com IF NOT EXISTS, então um abort no meio é retomável pelo
-- retry sem "table already exists".

-- CreateTable
CREATE TABLE IF NOT EXISTS "product_destination_defaults" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "productRef" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "product_destination_defaults_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "product_destination_defaults_userId_unitId_productRef_key" ON "product_destination_defaults"("userId", "unitId", "productRef");
