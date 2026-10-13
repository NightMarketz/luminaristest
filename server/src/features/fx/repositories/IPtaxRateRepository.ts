import type { PtaxRate } from 'generated/prisma';
import type { PtaxClosingQuote, PtaxCurrency } from '../models/ptax';

/**
 * Contrato do repositório de `ptax_rates` (BE-INCR-CRM-REPORT-BUILDER PR-1; BRIEF item 21). Único lugar com
 * `prisma.ptaxRate.*`. Append-only: sem update de cotação nem delete.
 */
export interface IPtaxRateRepository {
  /** Grava o fechamento; a mesma `(currency, rateDate)` uma segunda vez não duplica nem sobrescreve. */
  upsertClosing(quote: PtaxClosingQuote): Promise<PtaxRate>;
  /** A última cotação com `rateDate` ≤ `date` (sábado → sexta); `null` se não houver. */
  findLatestOnOrBefore(currency: PtaxCurrency, date: string): Promise<PtaxRate | null>;
  /** O maior `rateDate` guardado (`YYYY-MM-DD`), ou `null` com a tabela vazia para a moeda. */
  findLatestDate(currency: PtaxCurrency): Promise<string | null>;
}
