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
