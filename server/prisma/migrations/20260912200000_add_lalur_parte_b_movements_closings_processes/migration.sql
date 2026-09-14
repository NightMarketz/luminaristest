-- BE-INCR-SPED-ECF-FASE3C-parte-b (Forks N-1/F-3C-2/3/4/5 → a) — ADR-INCR-SPED-ECF-FASE3-lucro-real,
-- EMENDA 2026-09-12 (3ª), D-P1..D-P4 + correções C1..C4. É a "2ª migração" que a D-M5 nomeou de antemão
-- "para que o smoke-migration-gate não a receba como surpresa". Migração ADITIVA pura: 5 CREATE TABLE,
-- ZERO ALTER em tabela existente — `User`, `lalur_entries`, `lalur_parte_b_accounts` e `journal_entries`
-- só ganham relação REVERSA no schema Prisma (a FK mora do lado novo). Sem backfill: as cinco tabelas
-- nascem vazias (não existe movimento/fechamento/processo persistido antes desta migração).
--
-- Chaves (C1/C2): `lalur_parte_b_closings` é a linha-pai do fato "trimestre fechado" (existe mesmo com
-- zero contas); `lalur_processes.parentId` é NÃO-NULO (= entryId ?? movementId) porque dois pais nullable
-- não fechariam duplicata no índice único do SQLite (NULL distinto — classe D-M2).
-- `lalur_parte_b_movements` NÃO tem chave única: o leiaute do M410 não tem ("Campo(s) chave: —", p.268).
--
-- Prólogo defensivo `DROP ... IF EXISTS` (memória `migracao-sqlite-nao-e-transacional`): SQLite não
-- roda migração em transação, então um ABORT no meio deixa a metade de cima aplicada e o replay
-- morre em "table already exists". Os DROPs só tocam as CINCO tabelas NOVAS desta migração — nunca
-- uma tabela com dado. Ordem: filhas antes das mães (FKs processes→movements/entries,
-- balances→closings, entry_journal_entries→entries/journal_entries).
DROP TABLE IF EXISTS "lalur_processes";
DROP TABLE IF EXISTS "lalur_entry_journal_entries";
DROP TABLE IF EXISTS "lalur_parte_b_balances";
DROP TABLE IF EXISTS "lalur_parte_b_movements";
DROP TABLE IF EXISTS "lalur_parte_b_closings";

-- CreateTable
CREATE TABLE "lalur_parte_b_movements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "parteBId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" TEXT NOT NULL,
    "codTributo" TEXT NOT NULL,
    "valorCents" BIGINT NOT NULL,
    "indicador" TEXT NOT NULL,
    "contrapartidaId" TEXT,
    "historico" TEXT NOT NULL,
    "indLanAnt" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "lalur_parte_b_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lalur_parte_b_movements_parteBId_fkey" FOREIGN KEY ("parteBId") REFERENCES "lalur_parte_b_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "lalur_parte_b_movements_contrapartidaId_fkey" FOREIGN KEY ("contrapartidaId") REFERENCES "lalur_parte_b_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lalur_parte_b_closings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" TEXT NOT NULL,
    "balancesSha256" TEXT NOT NULL,
    "closedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedById" TEXT,
    CONSTRAINT "lalur_parte_b_closings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lalur_parte_b_balances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "closingId" TEXT NOT NULL,
    "parteBId" TEXT NOT NULL,
    "sdIniCents" BIGINT NOT NULL,
    "indSdIni" TEXT NOT NULL,
    "vlParteACents" BIGINT NOT NULL,
    "indVlParteA" TEXT NOT NULL,
    "vlParteBCents" BIGINT NOT NULL,
    "indVlParteB" TEXT NOT NULL,
    "sdFimCents" BIGINT NOT NULL,
    "indSdFim" TEXT NOT NULL,
    CONSTRAINT "lalur_parte_b_balances_closingId_fkey" FOREIGN KEY ("closingId") REFERENCES "lalur_parte_b_closings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lalur_parte_b_balances_parteBId_fkey" FOREIGN KEY ("parteBId") REFERENCES "lalur_parte_b_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lalur_processes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "entryId" TEXT,
    "movementId" TEXT,
    "indProc" TEXT NOT NULL,
    "numProc" TEXT NOT NULL,
    CONSTRAINT "lalur_processes_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "lalur_entries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "lalur_processes_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "lalur_parte_b_movements" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lalur_entry_journal_entries" (
    "entryId" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,

    PRIMARY KEY ("entryId", "journalEntryId"),
    CONSTRAINT "lalur_entry_journal_entries_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "lalur_entries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "lalur_entry_journal_entries_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "lalur_parte_b_movements_userId_unitId_year_quarter_idx" ON "lalur_parte_b_movements"("userId", "unitId", "year", "quarter");

-- CreateIndex
CREATE INDEX "lalur_parte_b_movements_parteBId_idx" ON "lalur_parte_b_movements"("parteBId");

-- CreateIndex
CREATE INDEX "lalur_parte_b_movements_deletedAt_idx" ON "lalur_parte_b_movements"("deletedAt");

-- CreateIndex
CREATE INDEX "lalur_parte_b_closings_userId_unitId_year_idx" ON "lalur_parte_b_closings"("userId", "unitId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "lalur_parte_b_closings_userId_unitId_year_quarter_key" ON "lalur_parte_b_closings"("userId", "unitId", "year", "quarter");

-- CreateIndex
CREATE INDEX "lalur_parte_b_balances_parteBId_idx" ON "lalur_parte_b_balances"("parteBId");

-- CreateIndex
CREATE UNIQUE INDEX "lalur_parte_b_balances_closingId_parteBId_key" ON "lalur_parte_b_balances"("closingId", "parteBId");

-- CreateIndex
CREATE INDEX "lalur_processes_entryId_idx" ON "lalur_processes"("entryId");

-- CreateIndex
CREATE INDEX "lalur_processes_movementId_idx" ON "lalur_processes"("movementId");

-- CreateIndex
CREATE UNIQUE INDEX "lalur_processes_parentId_indProc_numProc_key" ON "lalur_processes"("parentId", "indProc", "numProc");

-- CreateIndex
CREATE INDEX "lalur_entry_journal_entries_journalEntryId_idx" ON "lalur_entry_journal_entries"("journalEntryId");

