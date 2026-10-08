-- BE-INCR-KIT-SETOR PR-2 (nó KIT-SETOR; BRIEF item 9, §3.2; emenda §10 E-3, dono 08/10).
-- Tabela nova `kit_installations` (um kit por unidade) + backfill das unidades já ativadas.
--
-- Prólogo idempotente (memória migracao-sqlite-nao-e-transacional): `migrate deploy` no SQLite não envolve o
-- arquivo numa transação. Se abortar no meio, sobra a tabela e/ou os índices; reexecutar converge porque toda
-- criação é IF NOT EXISTS e o backfill é INSERT OR IGNORE sobre o @@unique(userId, unitId).

-- CreateTable
CREATE TABLE IF NOT EXISTS "kit_installations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "kitKey" TEXT NOT NULL,
    "kitVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "installedAt" DATETIME,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "kit_installations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "kit_installations_kitKey_kitVersion_idx" ON "kit_installations"("kitKey", "kitVersion");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "kit_installations_userId_unitId_key" ON "kit_installations"("userId", "unitId");

-- Backfill (E-3): toda unidade com binding Active de um setor que tem kit recebe a instalação v1 INSTALLED. O kit v1
-- é a migração literal do binding (PR-1, zero-diff: chartExtension/roleDefaults/serviceFiscalDefaults/referential
-- vazios), então a linha descreve exatamente o que a unidade já tem. Setor sem kit fica sem linha.
-- `installedAt`/`createdAt`/`updatedAt` = `compiledAt` do binding (mesma representação de data, sem conversão).
INSERT OR IGNORE INTO "kit_installations" ("id", "userId", "unitId", "kitKey", "kitVersion", "status", "steps", "installedAt", "updatedById", "createdAt", "updatedAt", "deletedAt")
SELECT
    'kitinst' || lower(hex(randomblob(10))),
    "userId",
    "unitId",
    "sectorKey",
    1,
    'INSTALLED',
    '{"lastCompletedStep":7,"warnings":[]}',
    "compiledAt",
    NULL,
    "compiledAt",
    "compiledAt",
    NULL
FROM "accounting_bindings"
WHERE "status" = 'Active'
  AND "deletedAt" IS NULL
  AND "sectorKey" IN ('beautySalon', 'aestheticClinic');
