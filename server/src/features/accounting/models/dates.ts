/**
 * Shared date-only validation for the accounting module (same "one canonical
 * home" rationale as money.ts/MAX_CENTS).
 *
 * A YYYY-MM-DD regex alone does NOT validate the calendar: JS Date silently
 * rolls day overflow forward ('2026-02-30' -> 2026-03-02, '2026-06-31' ->
 * 2026-07-01), so a regex-only boundary lets an invalid date MUTATE silently —
 * distorting fiscal-year derivation, the D6 ±3-day matching window and any
 * dated report. The round-trip check (parse at UTC midnight, format back,
 * compare) closes the whole class.
 */
import { ValidationError } from '../../../lib/errors';

export const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True iff `s` is a real calendar date in strict YYYY-MM-DD form. */
export function isValidDateOnly(s: string): boolean {
  if (!DATE_ONLY_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Dia-calendário `YYYY-MM-DD` de um INSTANTE, no fuso do ESCOPO — nunca em UTC.
 *
 * Por que não `.toISOString().slice(0,10)`: o produto opera em UTC-3, então das 21:00 às 23:59 BRT o
 * dia-calendário UTC já é o de AMANHÃ. No aging isso exibia como VENCIDA uma conta que vence hoje; nas
 * pontes (liquidação, devolução, estorno, CRM→AR) isso POSTA no razão com a data de amanhã — e numa
 * virada de mês pode cair em período diferente, batendo no gate de período fechado.
 *
 * ⚠ A REGRA DELICADA (por isso o short-circuit): uma string que JÁ É date-only volta INTACTA. Um
 * `YYYY-MM-DD` não é um instante — é um dia-calendário que alguém já escolheu. Reinterpretá-lo num
 * fuso é o bug que o doc de `PostingService.fiscalYearFrom` documenta: '2026-01-01' parseia como
 * meia-noite UTC, que em BRT é 31/12/2025 21:00, e o ano fiscal recuaria para 2025. Converter só o
 * que é instante de verdade (datetime ISO ou Date) é o que mantém as duas noções de acordo.
 *
 * `Intl.DateTimeFormat('en-CA')` é o caminho de stdlib: o locale en-CA formata exatamente como
 * `YYYY-MM-DD`, sem remontagem manual de partes onde um zero à esquerda possa se perder.
 * Este é o PRIMEIRO consumidor de `scope.timeZone` — até aqui o campo era declarado e nunca lido.
 *
 * @throws ValidationError se `instant` não for uma data/hora reconhecível — nunca inventa "hoje" em
 *   cima de lixo, porque isso gravaria uma data plausível e errada no razão.
 */
export function scopeDay(scope: { timeZone: string }, instant: string | Date = new Date()): string {
  if (typeof instant === 'string') {
    if (isValidDateOnly(instant)) return instant;

    // Guarda de CALENDÁRIO antes de parsear (date-only-regex-nao-valida-calendario): `new Date()`
    // rola '2026-02-30T00:00:00Z' para 03-02 EM SILÊNCIO, então parsear primeiro transformaria uma
    // data impossível numa data plausível. Se o prefixo tem forma de dia, ele tem de ser um dia real.
    const head = instant.slice(0, 10);
    if (DATE_ONLY_RE.test(head) && !isValidDateOnly(head)) {
      throw new ValidationError(`Data/hora inválida: '${instant}'.`);
    }
  }

  const d = typeof instant === 'string' ? new Date(instant) : instant;
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError(`Data/hora inválida: '${String(instant)}'.`);
  }
  return new Intl.DateTimeFormat('en-CA', { timeZone: scope.timeZone }).format(d);
}

/** "Hoje" no fuso do escopo. Açúcar sobre `scopeDay(scope)` — mesma fonte única de verdade. */
export function scopeToday(scope: { timeZone: string }): string {
  return scopeDay(scope);
}

// ─── Dia-calendário UTC por componente (extraído de AgingReportService, item 2/3 do checklist
// FE-INCR-CASH-FORECAST) — FONTE ÚNICA para qualquer código que precise comparar/enumerar dias-
// calendário sem depender do fuso local. Usado por AgingReportService (faixas de atraso) e por
// CashForecastReportService (janela diária da projeção). Nunca reimplementar localmente.

/**
 * Número do dia-calendário UTC (dias inteiros desde a época) de um instante, extraído POR
 * COMPONENTE (getUTCFullYear/Month/Date → Date.UTC). Imune ao bug de classe UTC-shift
 * (date-only-rendering-utc-shift-class-bug): jamais usa o fuso local nem depende da hora-do-dia
 * com que o instante foi persistido. `dueDate` é gravado como `new Date('YYYY-MM-DD')` (meia-noite
 * UTC), então o resultado é exato.
 */
export function toUtcDayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000);
}

/** Dia-calendário UTC de uma data-only `YYYY-MM-DD` (já validada), por componente — nunca via fuso local. */
export function dayNumberFromDateOnly(dateOnly: string): number {
  const [y, m, d] = dateOnly.split('-').map((n) => parseInt(n, 10));
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * Inverso de `dayNumberFromDateOnly`: formata um dia-calendário UTC de volta para `YYYY-MM-DD`,
 * por componente. Usado por CashForecastReportService para rotular cada linha diária da janela
 * `[asOf, asOf+horizonte]` sem reconverter via fuso local.
 */
export function dateOnlyFromDayNumber(dayNumber: number): string {
  const d = new Date(dayNumber * 86_400_000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
