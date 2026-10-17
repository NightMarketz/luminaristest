-- BE-INCR-DT-VERSION-LEDGER item 1 (D-2026-10-17; executa: dono, chat, 2026-10-17). Ledger append-only de
-- versões de linha e de schema das tabelas dinâmicas. Só tabelas e índices novos; nenhuma linha existente é
-- tocada (F-DTV-3 a: o BASELINE nasce na primeira escrita, não aqui).
-- FK com ON DELETE CASCADE (F-DTV-4 a — LGPD art. 16 caput / art. 18 VI, dossiê pesquisas-legais/lgpd-versoes-dt).
-- Memória `migracao-sqlite-nao-e-transacional`: IF NOT EXISTS em tudo — retry após abort parcial é seguro.

-- CreateTable
CREATE TABLE IF NOT EXISTS "dynamic_table_row_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dynamicTableId" TEXT NOT NULL,
    "dataId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "op" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "actorUserId" TEXT,
    "origin" TEXT NOT NULL,
    "restoredFromVersion" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dynamic_table_row_versions_dynamicTableId_fkey" FOREIGN KEY ("dynamicTableId") REFERENCES "dynamic_tables" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dynamic_table_row_versions_dataId_fkey" FOREIGN KEY ("dataId") REFERENCES "dynamic_table_data" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "dynamic_table_schema_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dynamicTableId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "op" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "actorUserId" TEXT,
    "origin" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dynamic_table_schema_versions_dynamicTableId_fkey" FOREIGN KEY ("dynamicTableId") REFERENCES "dynamic_tables" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "dynamic_table_row_versions_dataId_version_key" ON "dynamic_table_row_versions"("dataId", "version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dynamic_table_row_versions_dynamicTableId_createdAt_idx" ON "dynamic_table_row_versions"("dynamicTableId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "dynamic_table_schema_versions_dynamicTableId_version_key" ON "dynamic_table_schema_versions"("dynamicTableId", "version");
