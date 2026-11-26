import { assertNoOverlappingShifts, assertShiftsDoNotOverlap, type ScheduleInZone } from '../models/scheduleOverlap';
import type { ValidationError } from '../../../lib/errors';

/** BE-INCR-ESCALA-BASE item 7 — a escala de uma pessoa não se sobrepõe. */
function sch(id: string, n: number, shifts: Array<[number, number, number]>, extra: Partial<ScheduleInZone['schedule']> = {}, timeZone = 'America/Sao_Paulo'): ScheduleInZone {
  return {
    timeZone,
    schedule: { id, employeeId: 'e1', cycleLengthDays: n, cycleAnchorDate: '2024-01-01', validFrom: '2026-01-01', origin: 'DECLARED', ...extra },
    shifts: shifts.map(([d, s, dur], i) => ({ id: `${id}-${i}`, scheduleId: id, dayOfCycle: d, startMinute: s, durationMinutes: dur })),
  };
}

function codeOf(fn: () => void): { code?: string; ids?: unknown } {
  try {
    fn();
    return {};
  } catch (e) {
    const v = e as ValidationError;
    return { code: v.errorCode, ids: (v.details as Record<string, unknown>)?.ids };
  }
}

const shift = (id: string, dayOfCycle: number, startMinute: number, durationMinutes: number) => ({ id, dayOfCycle, startMinute, durationMinutes });

describe('assertNoOverlappingShifts (item 7)', () => {
  it('turnos do mesmo padrão que se tocam passam; que se sobrepõem, SCHEDULE_OVERLAP com os dois ids', () => {
    expect(() => assertShiftsDoNotOverlap(7, [shift('a', 1, 480, 240), shift('b', 1, 720, 240)])).not.toThrow();
    expect(codeOf(() => assertShiftsDoNotOverlap(7, [shift('a', 1, 480, 300), shift('b', 1, 720, 240)]))).toEqual({ code: 'SCHEDULE_OVERLAP', ids: ['a', 'b'] });
  });

  it('o turno que passa da meia-noite conflita com o primeiro do dia seguinte (e o último dia com o primeiro)', () => {
    expect(codeOf(() => assertShiftsDoNotOverlap(7, [shift('n', 1, 1320, 240), shift('m', 2, 60, 60)])).code).toBe('SCHEDULE_OVERLAP');
    expect(codeOf(() => assertShiftsDoNotOverlap(7, [shift('n', 7, 1320, 240), shift('m', 1, 60, 60)])).code).toBe('SCHEDULE_OVERLAP');
    expect(() => assertShiftsDoNotOverlap(7, [shift('n', 7, 1320, 120), shift('m', 1, 0, 60)])).not.toThrow();
  });

  it('dois padrões da mesma pessoa em unidades diferentes: seg–qua numa e qui–sáb noutra passam', () => {
    const a = sch('A', 7, [[1, 540, 480], [2, 540, 480], [3, 540, 480]], { unitId: 'u1' });
    const b = sch('B', 7, [[4, 540, 480], [5, 540, 480], [6, 540, 480]], { unitId: 'u2' });
    expect(() => assertNoOverlappingShifts([a, b])).not.toThrow();
  });

  it('dois padrões que se cruzam no mesmo dia (outra unidade, outro fuso) recusam', () => {
    const a = sch('A', 7, [[1, 540, 480]], { unitId: 'u1' });
    // 08:00 em Manaus = 09:00 em São Paulo: cruza o 09:00–17:00 de A.
    const b = sch('B', 7, [[1, 480, 120]], { unitId: 'u2' }, 'America/Manaus');
    expect(codeOf(() => assertNoOverlappingShifts([a, b]))).toEqual({ code: 'SCHEDULE_OVERLAP', ids: ['A', 'B'] });
    // O mesmo horário de parede antes das 09:00 de SP não cruza: 07:00 em Manaus = 08:00 em SP, por 1 h.
    const c = sch('C', 7, [[1, 420, 60]], { unitId: 'u2' }, 'America/Manaus');
    expect(() => assertNoOverlappingShifts([a, c])).not.toThrow();
  });

  it('ciclos diferentes (N = 2 e N = 7): o cruzamento que só aparece depois de alguns dias é achado', () => {
    const night = sch('N', 2, [[1, 1140, 720]]);
    const sat = sch('S', 7, [[6, 300, 60]]);
    expect(codeOf(() => assertNoOverlappingShifts([night, sat])).code).toBe('SCHEDULE_OVERLAP');
  });

  it('vigências disjuntas não conflitam', () => {
    const a = sch('A', 7, [[1, 540, 480]], { validTo: '2026-06-30' });
    const b = sch('B', 7, [[1, 540, 480]], { validFrom: '2026-07-01' });
    expect(() => assertNoOverlappingShifts([a, b])).not.toThrow();
  });
});
