-- BE-INCR-DP-F2 PR-0R (nó PES-4, BRIEF item 68; executa: dono, chat, 2026-11-06 "Executa o F2"): escala na jornada
-- (diasTrabalho, minutosPorDia). Gerada por `prisma migrate diff` do schema anterior. Jornadas do F1: segunda a sábado e
-- minutosPorDia = minutosSemanais ÷ 6 só quando divide exato; senão fica NULL (a migração não inventa escala; o cálculo
-- dá JORNADA_AUSENTE até o operador corrigir). Prólogo defensivo: SQLite não reverte a migração que aborta no meio.
DROP TABLE IF EXISTS "new_dp_jornadas";
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_dp_jornadas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "minutosSemanais" INTEGER NOT NULL,
    "tipoJornada" TEXT NOT NULL,
    "diasTrabalho" TEXT NOT NULL DEFAULT 'SEG,TER,QUA,QUI,SEX,SAB',
    "minutosPorDia" INTEGER,
    "descricao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dp_jornadas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_dp_jornadas" ("createdAt", "deletedAt", "descricao", "id", "minutosSemanais", "nome", "tipoJornada", "updatedAt", "userId") SELECT "createdAt", "deletedAt", "descricao", "id", "minutosSemanais", "nome", "tipoJornada", "updatedAt", "userId" FROM "dp_jornadas";
DROP TABLE "dp_jornadas";
ALTER TABLE "new_dp_jornadas" RENAME TO "dp_jornadas";
CREATE INDEX "dp_jornadas_userId_idx" ON "dp_jornadas"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

UPDATE "dp_jornadas" SET "minutosPorDia" = "minutosSemanais" / 6 WHERE "minutosSemanais" % 6 = 0 AND "minutosPorDia" IS NULL;
