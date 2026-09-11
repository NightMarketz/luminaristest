-- BE-INCR-SPED-ECF-FASE3B (Fork 4→b) — ADR-INCR-SPED-ECF-FASE3-lucro-real, EMENDA 2026-09-11 (2ª),
-- D-M1..D-M5. Migração ADITIVA pura: 2 CREATE TABLE, ZERO ALTER em tabela existente — `User` e
-- `accounts` só ganham relação REVERSA no schema Prisma (a FK mora do lado novo). Sem backfill: as
-- duas tabelas nascem vazias (não existe ajuste fiscal persistido antes desta migração).
--
-- Chaves únicas SEM `deletedAt` (D-M2): NULL é distinto no índice único do SQLite, então uma chave
-- com `deletedAt` não fecharia duplicidade viva; o archive faz rename-on-key na mesma tx
-- (`codigo`/`codCtaB` → `deleted:<id>:<valor>`), precedente SEC-A1-4 (Counterparty) / D3 (Payable).
--
-- Prólogo defensivo `DROP ... IF EXISTS` (memória `migracao-sqlite-nao-e-transacional`): SQLite não
-- roda migração em transação, então um ABORT no meio deixa a metade de cima aplicada e o replay
-- morre em "table already exists". Os DROPs só tocam as duas tabelas NOVAS desta migração — nunca
-- uma tabela com dado. Ordem: filha (lalur_entries) antes da mãe (FK parteBId).
DROP TABLE IF EXISTS "lalur_entries";
DROP TABLE IF EXISTS "lalur_parte_b_accounts";

-- CreateTable
CREATE TABLE "lalur_parte_b_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    -- M010 campos 2-10 (Manual do Leiaute 12, p.237): COD_CTA_B, DESC_CTA_LAL, DT_AP_LAL, COD_PB_RFB,
    -- DT_LIM_LAL, COD_TRIBUTO, VL_SALDO_INI, IND_VL_SALDO_INI, CNPJ_SIT_ESP.
    "codCtaB" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dtCriacao" DATETIME NOT NULL,
    "codPbRfb" TEXT NOT NULL,
    "dtLimite" DATETIME,
    "codTributo" TEXT NOT NULL,
    "saldoIniCents" BIGINT NOT NULL,
    "indSaldoIni" TEXT NOT NULL,
    "cnpjSitEsp" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "lalur_parte_b_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lalur_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" TEXT NOT NULL,
    "livro" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "valorCents" BIGINT NOT NULL,
    "indRelacao" TEXT,
    "histLancamento" TEXT,
    "parteBId" TEXT,
    "accountId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "lalur_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    -- archive da conta da Parte B é soft (rename-on-key) ⇒ RESTRICT nunca dispara no fluxo real
    CONSTRAINT "lalur_entries_parteBId_fkey" FOREIGN KEY ("parteBId") REFERENCES "lalur_parte_b_accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "lalur_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "lalur_entries_userId_unitId_year_idx" ON "lalur_entries"("userId", "unitId", "year");

-- CreateIndex
CREATE INDEX "lalur_entries_deletedAt_idx" ON "lalur_entries"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "lalur_entries_userId_unitId_year_quarter_livro_codigo_key" ON "lalur_entries"("userId", "unitId", "year", "quarter", "livro", "codigo");

-- CreateIndex
CREATE INDEX "lalur_parte_b_accounts_userId_unitId_idx" ON "lalur_parte_b_accounts"("userId", "unitId");

-- CreateIndex
CREATE INDEX "lalur_parte_b_accounts_deletedAt_idx" ON "lalur_parte_b_accounts"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "lalur_parte_b_accounts_userId_unitId_codCtaB_codTributo_key" ON "lalur_parte_b_accounts"("userId", "unitId", "codCtaB", "codTributo");
