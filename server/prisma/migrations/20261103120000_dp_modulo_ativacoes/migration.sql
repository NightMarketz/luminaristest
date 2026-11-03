-- BE-INCR-DP-F0-F1 PR-1 (nó PES-4, item 12) — tabela NOVA dp_modulo_ativacoes: ativação dos submódulos opcionais do DP,
-- por instância e com vigência por competência. Nenhuma tabela existente é tocada. Prólogo DROP TABLE IF EXISTS
-- (memória migracao-sqlite-nao-e-transacional): a tabela é nova, então o DROP nunca apaga dado de produção.
DROP TABLE IF EXISTS "dp_modulo_ativacoes";

-- CreateTable
CREATE TABLE "dp_modulo_ativacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "competenciaInicio" TEXT NOT NULL,
    "competenciaFim" TEXT,
    "motivo" TEXT NOT NULL,
    "motivoFim" TEXT,
    "createdById" TEXT NOT NULL,
    "endedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dp_modulo_ativacoes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "dp_modulo_ativacoes_userId_moduleKey_idx" ON "dp_modulo_ativacoes"("userId", "moduleKey");
