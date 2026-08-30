-- BRIEF-W2-A — identidade de contraparte: nameNormalized (trim + fold de caixa + colapso de espaços)
-- assume o `@@unique`, + `taxId` opcional só-dígitos. Forks ratificados 2026-08-30: F-W2A-3 (SEM
-- accent-folding), F-W2A-4 (taxId FORA da chave de unicidade), F-W2A-5 (colisão no backfill =
-- FAIL-LOUD via assert-trigger-ABORT, precedente `20260814120000_counterparty_notnull`).
--
-- ORDEM É O CONTRATO (mesma disciplina do precedente): (1) assert de colisão nas linhas VIVAS —
-- ABORT antes de tocar a tabela; (2) rebuild com nameNormalized (NOT NULL, backfillada) + taxId
-- (nullable, sem backfill — SEM dado histórico); (3) recria os 3 índices, com a chave única movida
-- de `name` para `nameNormalized`.
--
-- ATENÇÃO (mesma nota do precedente): o ABORT NÃO reverte a migração no SQLite — `prisma migrate
-- deploy` não a envolve em transação. O prólogo é idempotente (`IF EXISTS`) para um retry após abort
-- não morrer em "already exists" (memória migracao-sqlite-nao-e-transacional).
--
-- POR QUE SÓ AS LINHAS VIVAS ENTRAM NO ASSERT: uma linha arquivada carrega `deleted:<id>:<name>`
-- (SEC-A1-4) — o `id` (cuid, globalmente único) embutido no prefixo garante que duas tumbas do MESMO
-- nome original NUNCA colidem em nameNormalized entre si, nem com uma linha viva (cujo nome não
-- carrega o prefixo `deleted:`). O risco real de colisão introduzido pelo fold é só entre linhas VIVAS
-- do mesmo (userId,unitId,type) cujo nome, antes distinto por caixa/espaço, agora funde.
--
-- LIMITAÇÃO CONHECIDA (documentada, não bloqueante): a normalização em SQL puro usa `lower()`/`trim()`
-- nativos do SQLite, que são ASCII-only (sem extensão ICU) — divergem do `normalizeCounterpartyName`
-- em JS (`Counterparty.model.ts`, usa `String.prototype.toLowerCase()`/`trim()`, Unicode-aware) SÓ para
-- nomes com acentuação/whitespace não-ASCII, um subconjunto do mesmo eixo que F-W2A-3 já deixou de
-- fora do escopo desta fase. Afeta apenas o BACKFILL de linhas pré-existentes; toda escrita NOVA passa
-- pela função JS, que é a fonte de verdade. Sem efeito neste deploy: o dev.db real medido nesta sessão
-- tem 0 linhas em `counterparties` (ver PR).

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- 1. F-W2A-5 — assert de colisão nas linhas VIVAS. RAISE() só é legal dentro de um trigger; a sonda é
--    uma tabela + BEFORE INSERT trigger, no molde exato do precedente SEC-A1-5.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS "_w2a_assert_collision";
DROP TABLE IF EXISTS "_w2a_collision_probe";

CREATE TABLE "_w2a_collision_probe" ("id" INTEGER PRIMARY KEY);

CREATE TRIGGER "_w2a_assert_collision" BEFORE INSERT ON "_w2a_collision_probe"
WHEN EXISTS (
    SELECT 1 FROM (
        SELECT
            "userId", "unitId", "type",
            lower(trim(replace(replace(replace(replace(replace(replace(replace(replace(
                "name"
            , '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '))) AS "nn",
            COUNT(*) AS "c"
        FROM "counterparties"
        WHERE "deletedAt" IS NULL
        GROUP BY "userId", "unitId", "type", "nn"
        HAVING COUNT(*) > 1
    )
)
BEGIN
    SELECT RAISE(ABORT, 'BRIEF-W2-A (F-W2A-5): duas ou mais contrapartes VIVAS no mesmo (userId,unitId,type) colidem em nameNormalized apos trim+fold+colapso de espacos — revise manualmente antes de reaplicar');
END;

INSERT INTO "_w2a_collision_probe" ("id") VALUES (1);

DROP TRIGGER "_w2a_assert_collision";
DROP TABLE "_w2a_collision_probe";

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- 2. Rebuild — nameNormalized (NOT NULL, backfillada de `name` p/ TODA linha, viva e arquivada — comp.
--    6 do BRIEF) + taxId (nullable, SEM backfill — dado não existe hoje). `name` continua existindo,
--    vira puramente display (não constrangida). `@@unique` migra de [...,name] para [...,nameNormalized].
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_counterparties" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "ref" TEXT,
    "taxId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "counterparties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_counterparties" ("id", "userId", "unitId", "type", "name", "nameNormalized", "ref", "taxId", "createdById", "createdAt", "updatedAt", "deletedAt")
SELECT
    "id", "userId", "unitId", "type", "name",
    lower(trim(replace(replace(replace(replace(replace(replace(replace(replace(
        "name"
    , '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '))),
    "ref", NULL, "createdById", "createdAt", "updatedAt", "deletedAt"
FROM "counterparties";
DROP TABLE "counterparties";
ALTER TABLE "new_counterparties" RENAME TO "counterparties";
CREATE INDEX "counterparties_userId_unitId_type_idx" ON "counterparties"("userId", "unitId", "type");
CREATE INDEX "counterparties_deletedAt_idx" ON "counterparties"("deletedAt");
CREATE UNIQUE INDEX "counterparties_userId_unitId_type_nameNormalized_key" ON "counterparties"("userId", "unitId", "type", "nameNormalized");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
