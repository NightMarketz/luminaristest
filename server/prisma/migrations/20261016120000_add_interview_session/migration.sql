-- BE-INCR-INTERVIEW-SESSION PR-1 (nó W4; BRIEF item 1). Tabela nova `interview_sessions` — a sessão de customização
-- da Entrevista com IA sai do `Record` em memória do `StateManager`. Sem backfill: o estado em memória morre no
-- restart, não há o que migrar.
--
-- Prólogo idempotente (memória migracao-sqlite-nao-e-transacional): `migrate deploy` no SQLite não envolve o
-- arquivo numa transação; se abortar entre a tabela e o índice, reexecutar converge porque toda criação é IF NOT EXISTS.

-- CreateTable
CREATE TABLE IF NOT EXISTS "interview_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "presetKey" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "interview_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "interview_sessions_userId_expiresAt_idx" ON "interview_sessions"("userId", "expiresAt");
