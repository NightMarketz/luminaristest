-- BE-INCR-EFD-REINF PR-1 (BRIEF item 10, §5.2) — tabela NOVA `reinf_batches` + coluna anulável `reinfClassTrib` no perfil
-- fiscal (item 4; lacuna B, dono 26/10). Nenhum dado existente é reescrito: o S6 do smoke só vê a coluna nova nula.
-- Memória migracao-sqlite-nao-e-transacional: tabela/índice com IF NOT EXISTS; o ALTER é o último passo (um abort antes
-- dele é retomável pelo retry).

-- CreateTable
CREATE TABLE IF NOT EXISTS "reinf_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "tpAmb" INTEGER NOT NULL,
    "eventos" JSONB NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "protocolo" TEXT,
    "geradoPorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reinf_batches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reinf_batches_userId_competencia_idx" ON "reinf_batches"("userId", "competencia");

-- AlterTable
ALTER TABLE "company_fiscal_profiles" ADD COLUMN "reinfClassTrib" TEXT;
