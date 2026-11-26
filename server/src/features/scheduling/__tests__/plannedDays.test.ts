import { plannedDays } from '../ports/PlannedScheduleReader';
import type { ScheduleWithShifts } from '../models/rows';

/** BE-INCR-ESCALA-BASE item 8 — golden: 6×1 de 440 min com um feriado no mês. */
describe('plannedDays (item 8)', () => {
  // 6×1: segunda a sábado (dias 1..6 do ciclo semanal ancorado numa segunda), 08:00 por 440 min.
  const sixByOne: ScheduleWithShifts = {
    schedule: { id: 's1', employeeId: 'e1', unitId: 'u1', cycleLengthDays: 7, cycleAnchorDate: '2024-01-01', validFrom: '2024-01-01', origin: 'DECLARED' },
    shifts: [1, 2, 3, 4, 5, 6].map((d) => ({ id: `sh${d}`, scheduleId: 's1', dayOfCycle: d, startMinute: 480, durationMinutes: 440 })),
  };
  // Natal (sexta) projetado como exceção de dia inteiro em São Paulo.
  const christmas = {
    id: 'x1', unitId: 'u1', kind: 'HOLIDAY' as const, origin: 'HOLIDAY_CALENDAR' as const,
    startAt: '2026-12-25T03:00:00.000Z', endAt: '2026-12-26T03:00:00.000Z', sourceType: 'HOLIDAY' as const, sourceId: 'u1:2026-12-25',
  };

  it('dezembro/2026: 27 dias de segunda a sábado − 1 feriado = 26 × 440 = 11.440 minutos', () => {
    const days = plannedDays({ schedules: [sixByOne], exceptions: [christmas], timeZone: 'America/Sao_Paulo', from: '2026-12-01', to: '2026-12-31' });
    expect(days).toHaveLength(31);
    expect(days.reduce((a, d) => a + d.minutes, 0)).toBe(11_440);
    expect(days.find((d) => d.date === '2026-12-25')?.minutes).toBe(0);
    expect(days.find((d) => d.date === '2026-12-27')?.minutes).toBe(0); // domingo
    expect(days.find((d) => d.date === '2026-12-01')).toEqual({
      date: '2026-12-01', minutes: 440, intervals: [{ startAt: '2026-12-01T11:00:00.000Z', endAt: '2026-12-01T18:20:00.000Z' }],
    });
  });

  it('turno que passa da meia-noite é dividido entre os dois dias locais', () => {
    const night: ScheduleWithShifts = {
      schedule: { id: 's2', employeeId: 'e1', cycleLengthDays: 2, cycleAnchorDate: '2026-12-01', validFrom: '2026-12-01', origin: 'DECLARED' },
      shifts: [{ id: 'n', scheduleId: 's2', dayOfCycle: 1, startMinute: 1140, durationMinutes: 720 }],
    };
    const days = plannedDays({ schedules: [night], exceptions: [], timeZone: 'America/Sao_Paulo', from: '2026-12-01', to: '2026-12-02' });
    expect(days.map((d) => d.minutes)).toEqual([300, 420]);
  });
});
