/**
 * BE-INCR-ESCALA-BASE item 8 (F-ESC-8; D-3 do F0+F1) — o contrato de leitura da escala planejada.
 *
 * É o que o DP consumirá por porta própria (a `DpJornada` continua a fonte da folha). Aqui fica a interface e a
 * implementação pura `plannedDays`: por dia local da unidade, os minutos e os intervalos planejados, já com as exceções
 * (item 4). Um turno que passa da meia-noite é dividido entre os dois dias locais (cada dia conta o que cai nele).
 */
import { addDays } from '../models/cycle';
import { localMinuteToInstant, resolveAvailability } from '../models/availability';
import type { ExceptionRow, ScheduleWithShifts } from '../models/rows';

export interface PlannedDay {
  date: string;
  minutes: number;
  intervals: Array<{ startAt: string; endAt: string }>;
}

export interface PlannedScheduleReader {
  plannedDays(
    userId: string,
    target: { employeeId: string } | { resourceId: string },
    unitId: string | null,
    from: string,
    to: string,
  ): Promise<PlannedDay[]>;
}

/**
 * Implementação pura: `schedules` e `exceptions` já são os que valem para o alvo (`selectApplicableExceptions`);
 * `from`/`to` date-only inclusivos, no fuso `timeZone`.
 */
export function plannedDays(i: {
  schedules: ScheduleWithShifts[];
  exceptions: ExceptionRow[];
  timeZone: string;
  from: string;
  to: string;
}): PlannedDay[] {
  const out: PlannedDay[] = [];
  for (let day = i.from; day <= i.to; day = addDays(day, 1)) {
    const range = { start: localMinuteToInstant(day, 0, i.timeZone), end: localMinuteToInstant(addDays(day, 1), 0, i.timeZone) };
    const intervals = resolveAvailability({ schedules: i.schedules, exceptions: i.exceptions, timeZone: i.timeZone, range });
    out.push({
      date: day,
      minutes: intervals.reduce((acc, x) => acc + Math.round((x.end - x.start) / 60_000), 0),
      intervals: intervals.map((x) => ({ startAt: new Date(x.start).toISOString(), endAt: new Date(x.end).toISOString() })),
    });
  }
  return out;
}
