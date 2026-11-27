/**
 * BE-INCR-ESCALA-BASE item 22 — conversão pura do `workSchedule` nos formatos reais do FE.
 * Run: npx jest src/features/scheduling/__tests__/workScheduleMigration.test.ts --selectProjects unit
 */
import { minuteOfDay, shiftsFromWorkSchedule, WEEKLY_ANCHOR } from '../models/workScheduleMigration';
import { dayOfCycle } from '../models/cycle';

describe('item 22 — shiftsFromWorkSchedule', () => {
  it('âncora 2024-01-01 é segunda: segunda = dia 1, domingo = dia 7', () => {
    expect(dayOfCycle('2024-01-01', WEEKLY_ANCHOR, 7)).toBe(1);
    expect(dayOfCycle('2026-11-30', WEEKLY_ANCHOR, 7)).toBe(1); // segunda
    expect(dayOfCycle('2026-11-29', WEEKLY_ANCHOR, 7)).toBe(7); // domingo
  });

  it('`active` ausente = dia de trabalho; `active: false` com horário não vira turno; `start` vazio pula', () => {
    const ws = {
      monday: { start: '09:00', end: '18:00' },
      tuesday: { start: '09:00', end: '18:00', active: true },
      wednesday: { start: '09:00', end: '18:00', active: false },
      thursday: { start: '', end: '18:00' },
      friday: { start: '08:30', end: '12:15', active: true },
      sunday: { start: '10:00', end: '14:00' },
    };
    expect(shiftsFromWorkSchedule(ws)).toEqual([
      { dayOfCycle: 1, startMinute: 540, durationMinutes: 540 },
      { dayOfCycle: 2, startMinute: 540, durationMinutes: 540 },
      { dayOfCycle: 5, startMinute: 510, durationMinutes: 225 },
      { dayOfCycle: 7, startMinute: 600, durationMinutes: 240 },
    ]);
  });

  it('fim antes ou igual ao início, horário malformado e formato não-objeto não viram turno', () => {
    expect(shiftsFromWorkSchedule({ monday: { start: '18:00', end: '09:00' }, tuesday: { start: '9h', end: '18:00' } })).toEqual([]);
    expect(shiftsFromWorkSchedule(null)).toEqual([]);
    expect(shiftsFromWorkSchedule('{"monday":{}}')).toEqual([]);
    expect(shiftsFromWorkSchedule([])).toEqual([]);
  });

  it('minuteOfDay aceita 24:00 como fim de dia e recusa o resto fora da faixa', () => {
    expect(minuteOfDay('24:00')).toBe(1440);
    expect(minuteOfDay('24:30')).toBeNull();
    expect(minuteOfDay('12:60')).toBeNull();
    expect(minuteOfDay('7:05')).toBe(425);
  });
});
