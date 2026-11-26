/**
 * BE-INCR-ESCALA-BASE item 2 (F-ESC-4) — dia do ciclo de N dias ancorado numa data.
 *
 * Contado no número de dia-calendário (date-only, `dayNumberFromDateOnly`), nunca por `Date` local: o fuso do processo
 * não entra (memória date-only-rendering-utc-shift).
 */
import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from '../../accounting/models/dates';

/** `((dia(date) − dia(anchor)) mod n + n) mod n + 1` — 1-based, vale também para data antes da âncora. */
export function dayOfCycle(date: string, anchor: string, n: number): number {
  const diff = dayNumberFromDateOnly(date) - dayNumberFromDateOnly(anchor);
  return (((diff % n) + n) % n) + 1;
}

/** Soma `days` dias a uma date-only, por número de dia. */
export function addDays(date: string, days: number): string {
  return dateOnlyFromDayNumber(dayNumberFromDateOnly(date) + days);
}

export { dayNumberFromDateOnly, dateOnlyFromDayNumber };
