/**
 * BE-INCR-ESCALA-BASE item 7 (F-ESC-11) — a escala de **uma** pessoa (ou recurso) não se sobrepõe.
 *
 * (i) Turnos do mesmo padrão: no círculo do ciclo (N × 1440 minutos locais), inclusive o turno que passa da meia-noite
 * contra o primeiro do dia seguinte e o do último dia contra o primeiro do ciclo. (ii) Dois padrões da mesma pessoa, na
 * mesma unidade ou em outra (cada uma no seu fuso): os turnos não se sobrepõem no tempo, na vigência comum. A combinação
 * de dois ciclos se repete a cada `mmc(N1, N2)` dias, então basta expandir isso (+1 dia para a meia-noite).
 * Erro `SCHEDULE_OVERLAP` com os dois ids.
 */
import { MINUTES_PER_DAY } from '../dtos/rows';
import { expandShifts, type Interval } from './availability';
import { addDays, dayNumberFromDateOnly } from './cycle';
import { schedulingError } from './errors';
import type { ScheduleWithShifts, ShiftRow } from './rows';

const DAY_MS = 86_400_000;

export interface ScheduleInZone extends ScheduleWithShifts {
  timeZone: string;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

type ShiftShape = Pick<ShiftRow, 'id' | 'dayOfCycle' | 'startMinute' | 'durationMinutes'>;

/** (i) Turnos de um padrão não se sobrepõem no círculo do ciclo. */
export function assertShiftsDoNotOverlap(cycleLengthDays: number, shifts: ShiftShape[]): void {
  const L = cycleLengthDays * MINUTES_PER_DAY;
  const arcs = shifts.map((s) => {
    const a = (s.dayOfCycle - 1) * MINUTES_PER_DAY + s.startMinute;
    return { id: s.id, a, b: a + s.durationMinutes };
  });
  for (let i = 0; i < arcs.length; i++) {
    for (let j = i + 1; j < arcs.length; j++) {
      for (const k of [-1, 0, 1]) {
        const aj = arcs[j].a + k * L;
        const bj = arcs[j].b + k * L;
        if (arcs[i].a < bj && aj < arcs[i].b) {
          throw schedulingError('SCHEDULE_OVERLAP', 'Turnos da mesma escala se sobrepõem.', { ids: [arcs[i].id, arcs[j].id] });
        }
      }
    }
  }
}

/** (ii) Dois padrões do mesmo alvo não se sobrepõem no tempo, na vigência comum. */
export function assertSchedulesDoNotOverlap(x: ScheduleInZone, y: ScheduleInZone): void {
  const from = x.schedule.validFrom > y.schedule.validFrom ? x.schedule.validFrom : y.schedule.validFrom;
  const n1 = x.schedule.cycleLengthDays;
  const n2 = y.schedule.cycleLengthDays;
  const period = (n1 / gcd(n1, n2)) * n2;
  let to = addDays(from, period + 1);
  for (const e of [x.schedule.validTo, y.schedule.validTo]) if (e && e < to) to = e;
  if (to < from) return; // vigências disjuntas
  // Folga de dias em instante: a vigência por dia local de cada padrão fica com o expandShifts.
  const range: Interval = {
    start: (dayNumberFromDateOnly(from) - 2) * DAY_MS,
    end: (dayNumberFromDateOnly(to) + 3) * DAY_MS,
  };
  const a = expandShifts([x], range, x.timeZone);
  const b = expandShifts([y], range, y.timeZone);
  for (const i of a) {
    for (const j of b) {
      if (i.start < j.end && j.start < i.end) {
        throw schedulingError('SCHEDULE_OVERLAP', 'Duas escalas do mesmo alvo se sobrepõem no tempo.', { ids: [x.schedule.id, y.schedule.id] });
      }
    }
  }
}

/** Item 7 — os dois testes sobre todos os padrões vivos de um alvo. */
export function assertNoOverlappingShifts(items: ScheduleInZone[]): void {
  for (const it of items) assertShiftsDoNotOverlap(it.schedule.cycleLengthDays, it.shifts);
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) assertSchedulesDoNotOverlap(items[i], items[j]);
  }
}
