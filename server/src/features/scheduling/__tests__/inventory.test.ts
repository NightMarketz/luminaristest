import { inventoryOf } from '../models/inventory';

/** BE-INCR-ESCALA-BASE item 21 — o inventário conta (a)–(e) sobre os formatos reais do FE. */
describe('inventoryOf (item 21)', () => {
  const employees = [
    { id: 'e1', data: { unitId: 'u1', workSchedule: { monday: { active: true, start: '09:00', end: '18:00' }, sunday: { active: false, start: '09:00', end: '12:00' } } } },
    { id: 'e2', data: { workSchedule: { tuesday: { start: '10:00', end: '16:00' } } } }, // formato antigo, sem unidade
    { id: 'e3', data: { unitId: 'u1', workSchedule: { monday: { active: true, start: '', end: '' } } } }, // sem horário
    { id: 'e4', data: { unitId: 'u1' } },
  ];
  const appt = (id: string, emp: string | undefined, unit: string, s: string, e: string, status = 'Scheduled') => ({
    id, data: { responsibleEmployeeId: emp, unitId: unit, startAt: s, endAt: e, status },
  });
  const appointments = [
    appt('a1', 'e1', 'u1', '2026-12-01T12:00:00Z', '2026-12-01T13:00:00Z'),
    appt('a2', 'e1', 'u2', '2026-12-01T12:30:00Z', '2026-12-01T13:30:00Z'), // sobrepõe a1 noutra unidade
    appt('a3', 'e1', 'u1', '2026-12-01T12:30:00Z', '2026-12-01T13:30:00Z'), // mesma unidade: não conta em (d)
    appt('a4', 'e1', 'u2', '2026-12-01T12:00:00Z', '2026-12-01T13:00:00Z', 'Cancelled'), // não vivo
    appt('a5', undefined, 'u1', '2026-12-01T12:00:00Z', '2026-12-01T13:00:00Z'),
  ];

  it('conta (a)–(e)', () => {
    expect(inventoryOf(employees, appointments)).toEqual({
      employeesWithWorkSchedule: 2,
      inactiveDaysWithHours: 1,
      employeesWithScheduleWithoutUnit: 1,
      crossUnitOverlappingPairs: 2, // a1×a2 e a2×a3
      appointmentsWithoutProfessional: 1,
    });
  });

  it('vazio dá zero', () => {
    expect(Object.values(inventoryOf([], [])).every((v) => v === 0)).toBe(true);
  });
});
