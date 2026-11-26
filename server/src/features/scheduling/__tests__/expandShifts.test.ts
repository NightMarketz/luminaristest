import { expandShifts, type Interval } from '../models/availability';
import type { ScheduleWithShifts } from '../models/rows';

/** BE-INCR-ESCALA-BASE item 3 — turnos em instante, no fuso da unidade, pegando o turno que passa da meia-noite. */
const iso = (s: string) => Date.parse(s);
const asIso = (xs: Interval[]) => xs.map((i) => [new Date(i.start).toISOString(), new Date(i.end).toISOString()]);

function pattern(n: number, shifts: Array<[number, number, number]>, anchor = '2026-12-01'): ScheduleWithShifts {
  return {
    schedule: { id: 's1', employeeId: 'e1', cycleLengthDays: n, cycleAnchorDate: anchor, validFrom: '2026-01-01', origin: 'DECLARED' },
    shifts: shifts.map(([dayOfCycle, startMinute, durationMinutes], i) => ({ id: `sh${i}`, scheduleId: 's1', dayOfCycle, startMinute, durationMinutes })),
  };
}

describe('expandShifts (item 3)', () => {
  // 12×36 noturno: N = 2, dia 1 às 19:00 por 720 min; âncora 01/12.
  const twelveBy36 = pattern(2, [[1, 19 * 60, 720]]);

  it('12×36 noturno em São Paulo: turno de 01/12 19:00 a 02/12 07:00 (UTC−3)', () => {
    const range = { start: iso('2026-12-01T03:00:00Z'), end: iso('2026-12-05T03:00:00Z') }; // 01/12 a 04/12 locais
    expect(asIso(expandShifts([twelveBy36], range, 'America/Sao_Paulo'))).toEqual([
      ['2026-12-01T22:00:00.000Z', '2026-12-02T10:00:00.000Z'],
      ['2026-12-03T22:00:00.000Z', '2026-12-04T10:00:00.000Z'],
    ]);
  });

  it('intervalo que começa depois da meia-noite pega o turno de ontem (varre um dia antes)', () => {
    // 02/12 00:00 a 12:00 em SP: só o rabo do turno de 01/12.
    const range = { start: iso('2026-12-02T03:00:00Z'), end: iso('2026-12-02T15:00:00Z') };
    expect(asIso(expandShifts([twelveBy36], range, 'America/Sao_Paulo'))).toEqual([
      ['2026-12-02T03:00:00.000Z', '2026-12-02T10:00:00.000Z'],
    ]);
  });

  it('o mesmo turno em Manaus (UTC−4) cai uma hora depois em UTC', () => {
    const range = { start: iso('2026-12-01T04:00:00Z'), end: iso('2026-12-03T04:00:00Z') };
    expect(asIso(expandShifts([twelveBy36], range, 'America/Manaus'))).toEqual([
      ['2026-12-01T23:00:00.000Z', '2026-12-02T11:00:00.000Z'],
    ]);
  });

  it('vigência: o turno do dia fora de validFrom..validTo não entra', () => {
    const p = pattern(1, [[1, 9 * 60, 60]]);
    p.schedule.validFrom = '2026-12-02';
    p.schedule.validTo = '2026-12-02';
    const range = { start: iso('2026-12-01T03:00:00Z'), end: iso('2026-12-04T03:00:00Z') };
    expect(asIso(expandShifts([p], range, 'America/Sao_Paulo'))).toEqual([['2026-12-02T12:00:00.000Z', '2026-12-02T13:00:00.000Z']]);
  });

  it('intervalo vazio devolve nada', () => {
    expect(expandShifts([twelveBy36], { start: 10, end: 10 }, 'America/Sao_Paulo')).toEqual([]);
  });
});
