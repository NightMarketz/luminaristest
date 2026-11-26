/**
 * BE-INCR-ESCALA-BASE itens 3–6 — disponibilidade resolvida (núcleo puro, sem Prisma, sem `paises/`).
 *
 * Intervalos em epoch ms, semiabertos `[start, end)`. Hora local da unidade → instante por `date-fns-tz`
 * (`fromZonedTime`); nenhum `getDay`/`getHours`/`new Date(y, m, d)`, que leriam o fuso do processo (F-ESC-13).
 */
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { addDays, dayOfCycle } from './cycle';
import { UNAVAILABLE_EXCEPTION_KINDS } from '../dtos/rows';
import type { ExceptionRow, ScheduleRow, ScheduleWithShifts } from './rows';

export interface Interval {
  start: number;
  end: number;
}

const MINUTE_MS = 60_000;

/** Dia local (`YYYY-MM-DD`) de um instante no fuso. */
export function localDay(instant: number, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, 'yyyy-MM-dd');
}

/** Instante da hora de parede `day` + `minute` no fuso. */
export function localMinuteToInstant(day: string, minute: number, timeZone: string): number {
  const hh = String(Math.floor(minute / 60)).padStart(2, '0');
  const mm = String(minute % 60).padStart(2, '0');
  return fromZonedTime(`${day}T${hh}:${mm}:00`, timeZone).getTime();
}

/** O padrão vale no dia local `day` (vigência inclusiva). */
export function isScheduleValidOn(s: ScheduleRow, day: string): boolean {
  return day >= s.validFrom && (s.validTo == null || day <= s.validTo);
}

function clip(i: Interval, range: Interval): Interval | null {
  const start = Math.max(i.start, range.start);
  const end = Math.min(i.end, range.end);
  return end > start ? { start, end } : null;
}

function byStart(a: Interval, b: Interval): number {
  return a.start - b.start || a.end - b.end;
}

/**
 * Item 3 — os intervalos `[início, fim)` em instante UTC dos turnos vigentes que tocam `range`, cortados a ele. A
 * varredura começa **um dia local antes** do intervalo, para pegar o turno que começou ontem e passa da meia-noite.
 */
export function expandShifts(schedules: ScheduleWithShifts[], range: Interval, timeZone: string): Interval[] {
  if (range.end <= range.start) return [];
  const firstDay = addDays(localDay(range.start, timeZone), -1);
  const lastDay = localDay(range.end - 1, timeZone);
  const out: Interval[] = [];
  for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) {
    for (const { schedule, shifts } of schedules) {
      if (!isScheduleValidOn(schedule, day)) continue;
      const k = dayOfCycle(day, schedule.cycleAnchorDate, schedule.cycleLengthDays);
      for (const sh of shifts) {
        if (sh.dayOfCycle !== k) continue;
        const start = localMinuteToInstant(day, sh.startMinute, timeZone);
        const c = clip({ start, end: start + sh.durationMinutes * MINUTE_MS }, range);
        if (c) out.push(c);
      }
    }
  }
  return out.sort(byStart);
}

/** União: ordena e funde os que se sobrepõem ou se tocam. Resultado ordenado e disjunto. */
export function mergeIntervals(xs: Interval[]): Interval[] {
  const sorted = xs.filter((i) => i.end > i.start).sort(byStart);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ start: i.start, end: i.end });
  }
  return out;
}

/** `a − b`, os dois já fundidos (ordenados e disjuntos). */
export function subtractIntervals(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const i of a) {
    let cursor = i.start;
    for (const cut of b) {
      if (cut.end <= cursor) continue;
      if (cut.start >= i.end) break;
      if (cut.start > cursor) out.push({ start: cursor, end: cut.start });
      cursor = Math.max(cursor, cut.end);
      if (cursor >= i.end) break;
    }
    if (cursor < i.end) out.push({ start: cursor, end: i.end });
  }
  return out;
}

export type ScheduleTarget = { employeeId: string } | { resourceId: string };

/**
 * Item 4 — quais exceções valem para um alvo numa unidade. A exceção **com alvo** vale para aquela pessoa ou recurso em
 * **qualquer** unidade (a pessoa afastada não atende em lugar nenhum). A exceção **sem alvo** vale para todos os alvos
 * daquela unidade.
 */
export function selectApplicableExceptions<E extends ExceptionRow>(exceptions: E[], target: ScheduleTarget, unitId: string | null): E[] {
  return exceptions.filter((e) => {
    if (e.employeeId || e.resourceId) {
      return 'employeeId' in target ? e.employeeId === target.employeeId : e.resourceId === target.resourceId;
    }
    return unitId != null && e.unitId === unitId;
  });
}

/**
 * Item 4 (F-ESC-6) — disponibilidade = união dos turnos − exceções de indisponibilidade (`DAY_OFF`, `BLOCK`, `ABSENCE`,
 * `HOLIDAY`) + exceções `EXTRA`, dentro de `range`. A `EXTRA` vence a indisponibilidade no mesmo trecho (o encaixe
 * planejado num feriado). As `exceptions` já são as que valem para o alvo (`selectApplicableExceptions`).
 */
export function resolveAvailability(i: {
  schedules: ScheduleWithShifts[];
  exceptions: ExceptionRow[];
  timeZone: string;
  range: Interval;
}): Interval[] {
  const base = mergeIntervals(expandShifts(i.schedules, i.range, i.timeZone));
  const toInterval = (e: ExceptionRow) => clip({ start: Date.parse(e.startAt), end: Date.parse(e.endAt) }, i.range);
  const unavailable = mergeIntervals(
    i.exceptions.filter((e) => (UNAVAILABLE_EXCEPTION_KINDS as readonly string[]).includes(e.kind)).map(toInterval).filter((x): x is Interval => x !== null),
  );
  const extras = i.exceptions.filter((e) => e.kind === 'EXTRA').map(toInterval).filter((x): x is Interval => x !== null);
  return mergeIntervals([...subtractIntervals(base, unavailable), ...extras]);
}

/**
 * Item 5 (F-ESC-5) — o agendamento cabe inteiro numa só faixa disponível (`available` fundido: faixas que se tocam já
 * viraram uma). Bordas inclusivas no semiaberto: começar no início do turno e terminar no fim dele cabe.
 */
export function isCovered(available: Interval[], appointment: Interval): boolean {
  if (appointment.end <= appointment.start) return false;
  return available.some((a) => a.start <= appointment.start && appointment.end <= a.end);
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Item 6 — inícios possíveis alinhados ao passo (grade de `stepMinutes` contada da época, que no fuso de hora cheia é a
 * grade local), com a duração inteira dentro de uma faixa disponível e sem tocar em `busy`.
 */
export function freeSlots(available: Interval[], busy: Interval[], durationMinutes: number, stepMinutes: number): Interval[] {
  const step = stepMinutes * MINUTE_MS;
  const dur = durationMinutes * MINUTE_MS;
  if (step <= 0 || dur <= 0) return [];
  const out: Interval[] = [];
  for (const a of mergeIntervals(available)) {
    for (let s = Math.ceil(a.start / step) * step; s + dur <= a.end; s += step) {
      const slot = { start: s, end: s + dur };
      if (!busy.some((b) => overlaps(slot, b))) out.push(slot);
    }
  }
  return out;
}
