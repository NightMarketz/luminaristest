-- BE-INCR-TEAMMATES PR-0 (nó TEAMMATES, itens 1–2 do BRIEF docs/accounting/BE-INCR-TEAMMATES-brief.md §2.1).
-- 8 tabelas NOVAS + emenda da action_proposals (F-TM-8 a: kind default 'TABLE_ROW', payload, teammateId,
-- channelMessageId, expiresAt).
--
-- Prólogo defensivo (item 2; memória migracao-sqlite-nao-e-transacional — `prisma migrate deploy` não envolve o
-- arquivo numa transação no SQLite):
--   * tabelas e índices novos: `IF NOT EXISTS` (precedente 20261013120000_add_ptax_rates) — um retry depois de abort
--     no meio converge sem apagar o que a 1ª tentativa já criou;
--   * action_proposals: padrão RedefineTables com `DROP TABLE IF EXISTS "new_action_proposals"` (precedente
--     20260923193300_add_ecd_rectification_columns). Janelas de abort, nomeadas:
--       - antes do `DROP TABLE "action_proposals"`: retry SEGURO — o prólogo limpa a new_ órfã; a original está intacta;
--       - entre o `DROP TABLE "action_proposals"` e o `RENAME`: ÚNICA janela NÃO segura (a new_ é a única cópia, e o
--         prólogo do retry a apagaria) — mesmo limite dos precedentes, sem transação real no SQLite;
--       - reaplicar o arquivo inteiro DEPOIS do sucesso não falha, mas a cópia lista só as colunas antigas: os 5
--         campos da emenda voltam ao default (kind = 'TABLE_ROW', o resto NULL). Prisma não reaplica migração
--         registrada; o caso existe só no teste de "rodar duas vezes".
-- Linhas antigas de action_proposals leem kind = 'TABLE_ROW' pelo DEFAULT da coluna (item 1).

-- CreateTable
CREATE TABLE IF NOT EXISTS "teammates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "playbook" TEXT NOT NULL,
    "allowedTools" JSONB NOT NULL,
    "toolOverrides" JSONB,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "fallbackProvider" TEXT,
    "fallbackModel" TEXT,
    "dailyTurnLimit" INTEGER NOT NULL DEFAULT 50,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "llm_credentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "secret" BLOB NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "last4" TEXT NOT NULL,
    "monthlyTokenBudget" INTEGER,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_turns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teammateId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "routineId" TEXT,
    "idempotencyKey" TEXT,
    "channelMessageId" TEXT,
    "input" TEXT,
    "hop" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT,
    "model" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "teammate_routines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teammateId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "schedule" JSONB,
    "webhookSecretHash" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "mcp_servers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" BLOB,
    "keyVersion" INTEGER,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_channels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_channel_members" (
    "channelId" TEXT NOT NULL,
    "teammateId" TEXT NOT NULL,

    PRIMARY KEY ("channelId", "teammateId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_channel_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "threadId" TEXT,
    "authorType" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "hop" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "new_action_proposals";
CREATE TABLE "new_action_proposals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "tableLabel" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TABLE_ROW',
    "payload" JSONB,
    "teammateId" TEXT,
    "channelMessageId" TEXT,
    "expiresAt" DATETIME,
    CONSTRAINT "action_proposals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_action_proposals" ("action", "createdAt", "data", "id", "status", "tableId", "tableLabel", "tableName", "updatedAt", "userId") SELECT "action", "createdAt", "data", "id", "status", "tableId", "tableLabel", "tableName", "updatedAt", "userId" FROM "action_proposals";
DROP TABLE "action_proposals";
ALTER TABLE "new_action_proposals" RENAME TO "action_proposals";
CREATE INDEX "action_proposals_userId_idx" ON "action_proposals"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "teammates_userId_idx" ON "teammates"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "agent_turns_idempotencyKey_key" ON "agent_turns"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_turns_teammateId_createdAt_idx" ON "agent_turns"("teammateId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "mcp_servers_userId_idx" ON "mcp_servers"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_channel_messages_channelId_createdAt_idx" ON "agent_channel_messages"("channelId", "createdAt");


-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "llm_credentials_userId_provider_key" ON "llm_credentials"("userId", "provider");
