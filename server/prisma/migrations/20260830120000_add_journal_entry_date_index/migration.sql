-- CreateIndex
CREATE INDEX "journal_entries_userId_unitId_date_idx" ON "journal_entries"("userId", "unitId", "date");
