/**
 * Porta do rastro (BE-INCR-KIT-SETOR PR-6, item 50). O `sectorKits` não importa `features/accounting` (fronteira):
 * a Factory implementa sobre o `JournalEntryRepository.findBySource`, fechada sobre o escopo.
 */
export interface TracedJournalEntry {
  id: string;
  sourceType: string;
  bindingId: string | null;
  bindingVersion: number | null;
}

export interface JournalEntryTracePort {
  findBySource(sourceType: string, sourceId: string): Promise<TracedJournalEntry | null>;
}
