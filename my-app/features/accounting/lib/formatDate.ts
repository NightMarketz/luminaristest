import { formatDateNumericBR } from '@/features/dashboard/shared/utils/formatters';

/**
 * Formats an ISO date-only value as dd/mm/aaaa, parsed as local midnight — never
 * shifts a day vs. UTC parsing.
 *
 * Thin wrapper over the canonical numeric + date-only-safe `formatDateNumericBR`.
 * Kept as a named export so its four callers (BalanceSheet/IncomeStatement/
 * JournalEntries/Ledger panels) don't have to change their imports. Passing
 * `iso.slice(0, 10)` preserves the exact previous semantics: only the date part
 * is taken and formatted as local midnight, byte-identical for the ISO strings
 * these screens receive.
 */
export function formatDate(iso: string): string {
  return formatDateNumericBR(iso.slice(0, 10));
}

/**
 * Hoje (`YYYY-MM-DD`) no fuso do ESCOPO contábil — nunca em UTC.
 *
 * Por que não `new Date().toISOString().slice(0,10)`: o produto opera em UTC-3, então das 21h às
 * 23h59 BRT o dia-calendário UTC já é o de AMANHÃ. Num write-path isso GRAVA o dia errado em
 * silêncio (lançamento, estorno, baixa, emissão/vencimento) e numa virada de mês cai em período
 * diferente, batendo no gate de período fechado. `en-CA` formata exatamente como `YYYY-MM-DD`, sem
 * remontagem manual de partes onde um zero à esquerda possa se perder — mesmo caminho de stdlib que
 * `scopeDay` usa no backend (server/src/features/accounting/models/dates.ts).
 *
 * ponytail: a constante de fuso é ESPELHADA de `AccountingScope.timeZone` (backend) e existe em
 * DUAS cópias no frontend por decisão do dono em 2026-09-02 (fork F3(b), um helper por feature):
 * esta e a de `features/dashboard/category-views/finance/hooks/sales/useSalesWizard.ts`. Ao mexer
 * numa, mexa na outra. Vira uma só quando o fuso for por tenant — aí ele desce do backend e as duas
 * cópias saem juntas.
 */
const SCOPE_TIME_ZONE = 'America/Sao_Paulo';

export function scopeToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: SCOPE_TIME_ZONE });
}
