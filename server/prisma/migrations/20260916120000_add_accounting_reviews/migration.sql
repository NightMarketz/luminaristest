-- BE-INCR-REVIEW-LAYER (no C11; F-C11-1..6 -> a, ratificados 2026-09-16). Migracao ADITIVA:
-- 2 CREATE TABLE, zero ALTER em tabela com dado. Prologo IF EXISTS (classe
-- migracao-sqlite-nao-e-transacional): um ABORT no meio deixa metade aplicada; a 2a passada
-- precisa poder recomecar do zero sem "table already exists".
DROP INDEX IF EXISTS "accounting_review_findings_userId_unitId_reviewId_idx";
DROP INDEX IF EXISTS "accounting_review_findings_reviewId_idx";
DROP INDEX IF EXISTS "accounting_reviews_userId_unitId_year_idx";
DROP INDEX IF EXISTS "accounting_reviews_ecdJobId_ecfJobId_key";
DROP TABLE IF EXISTS "accounting_review_findings";
DROP TABLE IF EXISTS "accounting_reviews";

-- CreateTable
CREATE TABLE "accounting_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "ecdJobId" TEXT,
    "ecfJobId" TEXT,
    "status" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "reviewerName" TEXT,
    "reviewerCrc" TEXT,
    "statement" TEXT,
    "closeReason" TEXT,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "accounting_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounting_reviews_ecdJobId_fkey" FOREIGN KEY ("ecdJobId") REFERENCES "accounting_data_exchange_jobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounting_reviews_ecfJobId_fkey" FOREIGN KEY ("ecfJobId") REFERENCES "accounting_data_exchange_jobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "accounting_review_findings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "register" TEXT NOT NULL,
    "locator" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "resolution" TEXT,
    "resolutionTargetType" TEXT,
    "resolutionTargetId" TEXT,
    "resolutionNote" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "accounting_review_findings_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "accounting_reviews" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "accounting_reviews_ecdJobId_ecfJobId_key" ON "accounting_reviews"("ecdJobId", "ecfJobId");

-- CreateIndex
CREATE INDEX "accounting_reviews_userId_unitId_year_idx" ON "accounting_reviews"("userId", "unitId", "year");

-- CreateIndex
CREATE INDEX "accounting_review_findings_reviewId_idx" ON "accounting_review_findings"("reviewId");

-- CreateIndex
CREATE INDEX "accounting_review_findings_userId_unitId_reviewId_idx" ON "accounting_review_findings"("userId", "unitId", "reviewId");
