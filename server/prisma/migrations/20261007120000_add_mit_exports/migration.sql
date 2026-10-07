-- BE-INCR-MIT-EXPORT PR-2 (nó X9; BRIEF item 11, contrato §2). Só tabela NOVA — nenhuma tabela existente é tocada,
-- então o S6 do smoke é vacuoso (memória smoke-gate-s6-x-migracao-de-dado).
-- Memória migracao-sqlite-nao-e-transacional: tudo com IF NOT EXISTS, e um abort no meio é retomável pelo retry.

-- CreateTable
CREATE TABLE IF NOT EXISTS "mit_exports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "anoCalendario" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "apuracaoIds" JSONB NOT NULL,
    "geradoPorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mit_exports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mit_exports_userId_anoCalendario_mes_idx" ON "mit_exports"("userId", "anoCalendario", "mes");
