/**
 * BE-INCR-ESCALA-BASE itens 3–6 — disponibilidade resolvida (núcleo puro, sem Prisma, sem `paises/`).
 *
 * Intervalos em epoch ms, semiabertos `[start, end)`. Hora local da unidade → instante por `date-fns-tz`
 * (`fromZonedTime`); nenhum `getDay`/`getHours`/`new Date(y, m, d)`, que leriam o fuso do processo (F-ESC-13).
 */
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { addDays, dayOfCycle } from './cycle';
import type { ScheduleRow, ScheduleWithShifts } from './rows';

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
