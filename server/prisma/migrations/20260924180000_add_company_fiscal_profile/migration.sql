-- BE-INCR-FISCAL-OBLIGATION-PROFILE PR-1 (nó X13; BRIEF item 1; PRE-ADR F-OBP-1/8/9 a; F-XP-2 a).
-- Só tabelas NOVAS (nenhuma tabela existente é tocada): vazias no dev.db real, S6 vacuoso declarado
-- (memória smoke-gate-s6-x-migracao-de-dado). Memória migracao-sqlite-nao-e-transacional: tudo com
-- IF NOT EXISTS, então um abort no meio é retomável pelo retry sem "table already exists".
-- company_signers antes de company_fiscal_profiles (FK Restrict do representante legal).

-- CreateTable
CREATE TABLE IF NOT EXISTS "company_signers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "qualifEcd" TEXT NOT NULL,
    "qualifEcf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fone" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "company_signers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "company_fiscal_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "anoCalendario" INTEGER NOT NULL,
    "regime" TEXT NOT NULL,
    "grandePorte" BOOLEAN,
    "inativa" BOOLEAN NOT NULL DEFAULT false,
    "aporteInvestidorAnjo" BOOLEAN,
    "livroCaixaSemEscrituracao" BOOLEAN,
    "distribuicaoAcimaBase" BOOLEAN,
    "declarante" JSONB,
    "ecdIndNire" TEXT,
    "ecdNire" TEXT,
    "ecdNumOrd" TEXT,
    "ecdNatLivr" TEXT,
    "ecfIndAliqCsll" TEXT,
    "ecfIndRecReceita" TEXT,
    "contadorContactId" TEXT,
    "representanteLegalSignerId" TEXT,
    "ecfRecibo" TEXT,
    "regimeTravadoEm" DATETIME,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "company_fiscal_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "company_fiscal_profiles_contadorContactId_fkey" FOREIGN KEY ("contadorContactId") REFERENCES "accounting_contacts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "company_fiscal_profiles_representanteLegalSignerId_fkey" FOREIGN KEY ("representanteLegalSignerId") REFERENCES "company_signers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "company_fiscal_profiles_contadorContactId_idx" ON "company_fiscal_profiles"("contadorContactId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "company_fiscal_profiles_representanteLegalSignerId_idx" ON "company_fiscal_profiles"("representanteLegalSignerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "company_fiscal_profiles_userId_anoCalendario_key" ON "company_fiscal_profiles"("userId", "anoCalendario");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "company_signers_userId_idx" ON "company_signers"("userId");
