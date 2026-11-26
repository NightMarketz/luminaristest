import { resourceSchema, scheduleExceptionSchema, scheduleSchema, scheduleShiftSchema } from '../dtos/rows';

/** BE-INCR-ESCALA-BASE item 1 — cada `superRefine` tem um caso que passa e um que falha. */
describe('scheduling dtos/rows (item 1)', () => {
  const schedule = { employeeId: 'e1', cycleLengthDays: 7, cycleAnchorDate: '2024-01-01', validFrom: '2026-12-01' };

  it('schedule: um alvo passa; nenhum ou os dois falham (XOR, SCHEDULE_TARGET_REQUIRED)', () => {
    expect(scheduleSchema.safeParse(schedule).success).toBe(true);
    expect(scheduleSchema.safeParse({ ...schedule, employeeId: undefined, resourceId: 'r1' }).success).toBe(true);
    const none = scheduleSchema.safeParse({ ...schedule, employeeId: undefined });
    expect(none.success).toBe(false);
    expect(none.error?.issues.map((i) => i.message)).toContain('SCHEDULE_TARGET_REQUIRED');
    expect(scheduleSchema.safeParse({ ...schedule, resourceId: 'r1' }).success).toBe(false);
  });

  it('schedule: validTo ≥ validFrom passa (inclusive); validTo < validFrom falha', () => {
    expect(scheduleSchema.safeParse({ ...schedule, validTo: '2026-12-01' }).success).toBe(true);
    expect(scheduleSchema.safeParse({ ...schedule, validTo: null }).success).toBe(true);
    const bad = scheduleSchema.safeParse({ ...schedule, validTo: '2026-11-30' });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0].path).toEqual(['validTo']);
  });

  it('data fora do calendário (2027-02-30) é recusada pelo isValidDateOnly, não só pela regex', () => {
    expect(scheduleSchema.safeParse({ ...schedule, validFrom: '2027-02-28' }).success).toBe(true);
    const bad = scheduleSchema.safeParse({ ...schedule, validFrom: '2027-02-30' });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0].message).toBe('date outside the calendar');
    expect(scheduleSchema.safeParse({ ...schedule, cycleAnchorDate: '2026-06-31' }).success).toBe(false);
  });

  it('schedule: ciclo entre 1 e 56; campo desconhecido recusado (.strict)', () => {
    expect(scheduleSchema.safeParse({ ...schedule, cycleLengthDays: 56 }).success).toBe(true);
    expect(scheduleSchema.safeParse({ ...schedule, cycleLengthDays: 57 }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...schedule, cycleLengthDays: 0 }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...schedule, extra: 1 }).success).toBe(false);
  });

  it('shift: limites de dia do ciclo, minuto de início e duração', () => {
    const shift = { scheduleId: 's1', dayOfCycle: 1, startMinute: 1140, durationMinutes: 720 };
    expect(scheduleShiftSchema.safeParse(shift).success).toBe(true);
    expect(scheduleShiftSchema.safeParse({ ...shift, startMinute: 1440 }).success).toBe(false);
    expect(scheduleShiftSchema.safeParse({ ...shift, durationMinutes: 0 }).success).toBe(false);
    expect(scheduleShiftSchema.safeParse({ ...shift, durationMinutes: 1441 }).success).toBe(false);
  });

  const exception = { unitId: 'u1', kind: 'BLOCK', startAt: '2026-12-01T12:00:00.000Z', endAt: '2026-12-01T13:00:00.000Z' };

  it('exception: no máximo um alvo; ausente = a unidade inteira', () => {
    expect(scheduleExceptionSchema.safeParse(exception).success).toBe(true);
    expect(scheduleExceptionSchema.safeParse({ ...exception, employeeId: 'e1' }).success).toBe(true);
    const both = scheduleExceptionSchema.safeParse({ ...exception, employeeId: 'e1', resourceId: 'r1' });
    expect(both.success).toBe(false);
    expect(both.error?.issues[0].message).toBe('one target at most');
  });

  it('exception: endAt > startAt comparado como instante (offset diferente não engana)', () => {
    // 09:30-03:00 = 12:30Z, depois de 12:00Z; como texto, "…T09:30…" < "…T12:00…" e daria errado.
    expect(scheduleExceptionSchema.safeParse({ ...exception, endAt: '2026-12-01T09:30:00-03:00' }).success).toBe(true);
    const bad = scheduleExceptionSchema.safeParse({ ...exception, endAt: '2026-12-01T12:00:00.000Z' });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0].path).toEqual(['endAt']);
  });

  it('exception: USER sem chave de projeção; projeção com chave', () => {
    expect(scheduleExceptionSchema.safeParse({ ...exception, origin: 'HOLIDAY_CALENDAR', kind: 'HOLIDAY', sourceType: 'HOLIDAY', sourceId: 'u1:2026-12-25' }).success).toBe(true);
    expect(scheduleExceptionSchema.safeParse({ ...exception, origin: 'HR', sourceType: undefined }).success).toBe(false);
    expect(scheduleExceptionSchema.safeParse({ ...exception, sourceType: 'HOLIDAY', sourceId: 'x' }).success).toBe(false);
  });

  it('resource: nome e tipo obrigatórios; isActive default true', () => {
    const r = resourceSchema.parse({ name: 'Sala 1', kind: 'room' });
    expect(r.isActive).toBe(true);
    expect(resourceSchema.safeParse({ name: '', kind: 'room' }).success).toBe(false);
  });
});
