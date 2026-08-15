-- BE-INCR-COUNTERPARTY-NOTNULL / SEC-A1-5 — hardening pass of ADR-INCR-COUNTERPARTY (F-CP1 → A1).
-- Forks ratified 2026-08-14: F-NN1(a) find-or-create in the service · F-NN2(a) FK RESTRICT ·
-- F-NN3 both tables in ONE migration · F-NN4(a) re-run the backfill, then assert · F-NN5(b) aging
-- keeps its (Sem contraparte) bucket as defence.
--
-- ORDER IS THE CONTRACT: (1) idempotent backfill, (2) assert zero NULL — ABORT before touching the
-- table, (3) rebuild with NOT NULL, (4) recreate every index. SQLite has no ALTER COLUMN, so NOT NULL
-- is a table rebuild, exactly like the 1st migration (20260715060000).

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. Backfill (F-NN4(a)) — byte-for-byte the same statements as 20260715060000, re-run to cover rows
--    born BETWEEN the two migrations. Idempotent: INSERT OR IGNORE on the unique key + the
--    "WHERE counterpartyId IS NULL" guard make a 2nd run a no-op (never P2002). Dedupe carries
--    userId+unitId (SEC-A1-2); the correlated UPDATE can only reach a Counterparty of the row's OWN
--    scope (SEC-A1-3). Timestamps are INTEGER ms-epoch to match how Prisma persists DateTime on
--    SQLite (memória sintetico-nao-cobre-formato-de-dado-real).
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO "counterparties" ("id", "userId", "unitId", "type", "name", "ref", "createdById", "createdAt", "updatedAt", "deletedAt")
SELECT
    'cp_' || lower(hex(randomblob(12))),
    "userId",
    "unitId",
    'SUPPLIER',
    "supplierName",
    NULL,
    NULL,
    (CAST(strftime('%s','now') AS INTEGER) * 1000),
    (CAST(strftime('%s','now') AS INTEGER) * 1000),
    NULL
FROM "payables"
WHERE "counterpartyId" IS NULL
GROUP BY "userId", "unitId", "supplierName";

UPDATE "payables"
SET "counterpartyId" = (
    SELECT "c"."id" FROM "counterparties" "c"
    WHERE "c"."userId" = "payables"."userId"
      AND "c"."unitId" = "payables"."unitId"
      AND "c"."type" = 'SUPPLIER'
      AND "c"."name" = "payables"."supplierName"
)
WHERE "counterpartyId" IS NULL;

INSERT OR IGNORE INTO "counterparties" ("id", "userId", "unitId", "type", "name", "ref", "createdById", "createdAt", "updatedAt", "deletedAt")
SELECT
    'cp_' || lower(hex(randomblob(12))),
    "userId",
    "unitId",
    'CUSTOMER',
    "customerName",
    NULL,
    NULL,
    (CAST(strftime('%s','now') AS INTEGER) * 1000),
    (CAST(strftime('%s','now') AS INTEGER) * 1000),
    NULL
FROM "receivables"
WHERE "counterpartyId" IS NULL
GROUP BY "userId", "unitId", "customerName";

UPDATE "receivables"
SET "counterpartyId" = (
    SELECT "c"."id" FROM "counterparties" "c"
    WHERE "c"."userId" = "receivables"."userId"
      AND "c"."unitId" = "receivables"."unitId"
      AND "c"."type" = 'CUSTOMER'
      AND "c"."name" = "receivables"."customerName"
)
WHERE "counterpartyId" IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. SEC-A1-5 assertion — "assere zero counterpartyId NULL in-scope ANTES de aplicar". A residual NULL
--    here means the backfill could not name an identity for that row: ABORT with the table untouched
--    rather than harden in the dark. RAISE() is only legal inside a trigger body, so the assertion is
--    a temporary BEFORE-INSERT trigger fired by a probe insert — SQLite has no bare RAISE statement
--    and no procedural IF.
--
--    ATENÇÃO: o ABORT **não** reverte a migração. `prisma migrate deploy` no SQLite não envolve o
--    arquivo numa transação — verificado: após o abort, o backfill acima segue commitado e a sonda
--    (tabela + triggers) sobrevive. Por isso o prólogo é idempotente: sem os `IF EXISTS`, o retry
--    depois de um abort morreria em `CREATE TABLE ... already exists`, escondendo a causa real.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS "_sec_a1_5_assert_payables";
DROP TRIGGER IF EXISTS "_sec_a1_5_assert_receivables";
DROP TABLE IF EXISTS "_sec_a1_5_probe";

CREATE TABLE "_sec_a1_5_probe" ("id" INTEGER PRIMARY KEY);

CREATE TRIGGER "_sec_a1_5_assert_payables" BEFORE INSERT ON "_sec_a1_5_probe"
WHEN EXISTS (SELECT 1 FROM "payables" WHERE "counterpartyId" IS NULL)
BEGIN
    SELECT RAISE(ABORT, 'SEC-A1-5: payables com counterpartyId NULL apos o backfill — NOT NULL nao aplicado');
END;

CREATE TRIGGER "_sec_a1_5_assert_receivables" BEFORE INSERT ON "_sec_a1_5_probe"
WHEN EXISTS (SELECT 1 FROM "receivables" WHERE "counterpartyId" IS NULL)
BEGIN
    SELECT RAISE(ABORT, 'SEC-A1-5: receivables com counterpartyId NULL apos o backfill — NOT NULL nao aplicado');
END;

INSERT INTO "_sec_a1_5_probe" ("id") VALUES (1);

DROP TRIGGER "_sec_a1_5_assert_payables";
DROP TRIGGER "_sec_a1_5_assert_receivables";
DROP TABLE "_sec_a1_5_probe";

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- 3. Rebuild ×2 — counterpartyId TEXT NOT NULL + FK ON DELETE RESTRICT (F-NN2(a)). Column list and
--    order mirror the live tables (INCR-INVENTORY made expenseAccountId nullable and added
--    inventoryProductRef/inventoryQty). Every index is recreated below the rename (2 idx + 1 unique
--    per table) — a dropped index here is a silent full-scan later.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_payables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierRef" TEXT,
    "documentNumber" TEXT,
    "description" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "expenseAccountId" TEXT,
    "inventoryProductRef" TEXT,
    "inventoryQty" INTEGER,
    "counterpartyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdById" TEXT,
    "cancelledById" TEXT,
    "cancelReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "payables_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    -- SET NULL, NÃO Restrict: é o que a tabela viva tem desde 20260720115019 (INCR-INVENTORY tornou a
    -- coluna nullable) e o que o schema declara (relação opcional sem onDelete ⇒ SET NULL). O risco
    -- latente "expenseAccountId RESTRICT→SET NULL" (master map §5.1 item 12) é frente PRÓPRIA — este
    -- rebuild não pode reverter de carona uma decisão que ninguém autorizou aqui.
    CONSTRAINT "payables_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payables_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "counterparties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_payables" ("amountCents", "cancelReason", "cancelledById", "counterpartyId", "createdAt", "createdById", "deletedAt", "description", "documentNumber", "dueDate", "expenseAccountId", "id", "inventoryProductRef", "inventoryQty", "issueDate", "status", "supplierName", "supplierRef", "unitId", "updatedAt", "userId") SELECT "amountCents", "cancelReason", "cancelledById", "counterpartyId", "createdAt", "createdById", "deletedAt", "description", "documentNumber", "dueDate", "expenseAccountId", "id", "inventoryProductRef", "inventoryQty", "issueDate", "status", "supplierName", "supplierRef", "unitId", "updatedAt", "userId" FROM "payables";
DROP TABLE "payables";
ALTER TABLE "new_payables" RENAME TO "payables";
CREATE INDEX "payables_userId_unitId_status_idx" ON "payables"("userId", "unitId", "status");
CREATE INDEX "payables_userId_unitId_dueDate_idx" ON "payables"("userId", "unitId", "dueDate");
CREATE UNIQUE INDEX "payables_userId_unitId_supplierName_documentNumber_key" ON "payables"("userId", "unitId", "supplierName", "documentNumber");

CREATE TABLE "new_receivables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerRef" TEXT,
    "documentNumber" TEXT,
    "description" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "revenueAccountId" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdById" TEXT,
    "cancelledById" TEXT,
    "cancelReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "receivables_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "receivables_revenueAccountId_fkey" FOREIGN KEY ("revenueAccountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "receivables_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "counterparties" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_receivables" ("amountCents", "cancelReason", "cancelledById", "counterpartyId", "createdAt", "createdById", "customerName", "customerRef", "deletedAt", "description", "documentNumber", "dueDate", "id", "issueDate", "revenueAccountId", "status", "unitId", "updatedAt", "userId") SELECT "amountCents", "cancelReason", "cancelledById", "counterpartyId", "createdAt", "createdById", "customerName", "customerRef", "deletedAt", "description", "documentNumber", "dueDate", "id", "issueDate", "revenueAccountId", "status", "unitId", "updatedAt", "userId" FROM "receivables";
DROP TABLE "receivables";
ALTER TABLE "new_receivables" RENAME TO "receivables";
CREATE INDEX "receivables_userId_unitId_status_idx" ON "receivables"("userId", "unitId", "status");
CREATE INDEX "receivables_userId_unitId_dueDate_idx" ON "receivables"("userId", "unitId", "dueDate");
CREATE UNIQUE INDEX "receivables_userId_unitId_customerName_documentNumber_key" ON "receivables"("userId", "unitId", "customerName", "documentNumber");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
