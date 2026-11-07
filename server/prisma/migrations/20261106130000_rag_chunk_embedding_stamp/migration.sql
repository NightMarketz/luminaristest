-- BE-INCR-RAG-DOCUMENTOS RAG-PR-A item 3: carimbo do embedding na "Chunk" (embeddingModel, embeddingDims, embeddedAt).
-- O vetor NÃO entra aqui: mora na vec0 de um arquivo SQLite próprio (decisão do dono, 2026-11-06: "vec0 em arquivo
-- próprio"), que o Prisma nunca abre.
--
-- Prólogo defensivo (memória migracao-sqlite-nao-e-transacional): o SQLite não tem `ADD COLUMN IF NOT EXISTS`, então
-- a tabela é redefinida (padrão RedefineTables) com `DROP TABLE IF EXISTS "new_Chunk"` antes. A cópia lê só as
-- colunas antigas, que existem nos dois estados: aplicar duas vezes converge (o carimbo volta a NULL, o que só faz o
-- `rag:reindex` refazer o embedding). Janela não segura: entre o `DROP TABLE "Chunk"` e o `RENAME` (mesmo limite dos
-- precedentes, sem transação real no SQLite). Linhas antigas ficam com o carimbo NULL: o `rag:reindex` é a migração
-- de saída do Qdrant (item 10).
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS "new_Chunk";
CREATE TABLE "new_Chunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "documentId" TEXT NOT NULL,
    "embeddingModel" TEXT,
    "embeddingDims" INTEGER,
    "embeddedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Chunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Chunk" ("id", "text", "index", "documentId", "createdAt")
SELECT "id", "text", "index", "documentId", "createdAt" FROM "Chunk";
DROP TABLE "Chunk";
ALTER TABLE "new_Chunk" RENAME TO "Chunk";
CREATE INDEX IF NOT EXISTS "Chunk_documentId_idx" ON "Chunk"("documentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
