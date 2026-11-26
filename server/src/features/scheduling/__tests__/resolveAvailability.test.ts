import fc from 'fast-check';
import { resolveAvailability, selectApplicableExceptions, type Interval } from '../models/availability';
import type { ExceptionRow, ScheduleWithShifts } from '../models/rows';
import { EXCEPTION_KINDS } from '../dtos/rows';

/** BE-INCR-ESCALA-BASE item 4 — turnos − indisponibilidade + EXTRA; regra de alcance das exceções. */
const TZ = 'America/Sao_Paulo';
const iso = (s: string) => Date.parse(s);
const asIso = (xs: Interval[]) => xs.map((i) => [new Date(i.start).toISOString(), new Date(i.end).toISOString()]);

// 09:00–18:00 todo dia (N = 1).
const daily: ScheduleWithShifts = {
  schedule: { id: 's1', employeeId: 'e1', unitId: 'u1', cycleLengthDays: 1, cycleAnchorDate: '2024-01-01', validFrom: '2024-01-01', origin: 'DECLARED' },
  shifts: [{ id: 'sh1', scheduleId: 's1', dayOfCycle: 1, startMinute: 540, durationMinutes: 540 }],
};
const day = { start: iso('2026-12-25T03:00:00Z'), end: iso('2026-12-26T03:00:00Z') }; // 25/12 local

let seq = 0;
function exc(kind: ExceptionRow['kind'], startAt: string, endAt: string, extra: Partial<ExceptionRow> = {}): ExceptionRow {
  return { id: `x${++seq}`, unitId: 'u1', kind, origin: 'USER', startAt, endAt, ...extra };
}

describe('resolveAvailability (item 4)', () => {
  it('sem exceção: o turno inteiro', () => {
    expect(asIso(resolveAvailability({ schedules: [daily], exceptions: [], timeZone: TZ, range: day }))).toEqual([
      ['2026-12-25T12:00:00.000Z', '2026-12-25T21:00:00.000Z'],
    ]);
  });

  it('BLOCK no meio parte o turno em dois', () => {
    const r = resolveAvailability({ schedules: [daily], exceptions: [exc('BLOCK', '2026-12-25T15:00:00Z', '2026-12-25T16:00:00Z')], timeZone: TZ, range: day });
    expect(asIso(r)).toEqual([
      ['2026-12-25T12:00:00.000Z', '2026-12-25T15:00:00.000Z'],
      ['2026-12-25T16:00:00.000Z', '2026-12-25T21:00:00.000Z'],
    ]);
  });

  it('HOLIDAY tira o dia; EXTRA no mesmo dia vence a indisponibilidade (encaixe planejado no feriado)', () => {
    const holiday = exc('HOLIDAY', '2026-12-25T03:00:00Z', '2026-12-26T03:00:00Z', { origin: 'HOLIDAY_CALENDAR', sourceType: 'HOLIDAY', sourceId: 'u1:2026-12-25' });
    expect(resolveAvailability({ schedules: [daily], exceptions: [holiday], timeZone: TZ, range: day })).toEqual([]);
    const extra = exc('EXTRA', '2026-12-25T13:00:00Z', '2026-12-25T17:00:00Z');
    expect(asIso(resolveAvailability({ schedules: [daily], exceptions: [holiday, extra], timeZone: TZ, range: day }))).toEqual([
      ['2026-12-25T13:00:00.000Z', '2026-12-25T17:00:00.000Z'],
    ]);
  });

  it('EXTRA fora do turno acrescenta disponibilidade', () => {
    const r = resolveAvailability({ schedules: [daily], exceptions: [exc('EXTRA', '2026-12-25T21:00:00Z', '2026-12-25T23:00:00Z')], timeZone: TZ, range: day });
    expect(asIso(r)).toEqual([['2026-12-25T12:00:00.000Z', '2026-12-25T23:00:00.000Z']]);
  });

  it('alcance: com alvo vale em qualquer unidade; sem alvo só na unidade', () => {
    const mine = exc('ABSENCE', '2026-12-25T03:00:00Z', '2026-12-26T03:00:00Z', { employeeId: 'e1', unitId: 'u2' });
    const other = exc('ABSENCE', '2026-12-25T03:00:00Z', '2026-12-26T03:00:00Z', { employeeId: 'e2' });
    const unitWide = exc('BLOCK', '2026-12-25T03:00:00Z', '2026-12-26T03:00:00Z', { unitId: 'u1' });
    const otherUnit = exc('BLOCK', '2026-12-25T03:00:00Z', '2026-12-26T03:00:00Z', { unitId: 'u2' });
    const all = [mine, other, unitWide, otherUnit];
    expect(selectApplicableExceptions(all, { employeeId: 'e1' }, 'u1').map((e) => e.id)).toEqual([mine.id, unitWide.id]);
    expect(selectApplicableExceptions(all, { employeeId: 'e1' }, 'u2').map((e) => e.id)).toEqual([mine.id, otherUnit.id]);
    expect(selectApplicableExceptions(all, { resourceId: 'r1' }, 'u1').map((e) => e.id)).toEqual([unitWide.id]);
  });

  it('propriedade: ordenado, disjunto, dentro do intervalo e indiferente à ordem das exceções', () => {
    const t0 = day.start;
    const H = 3_600_000;
    const arbExc = fc.record({
      kind: fc.constantFrom(...EXCEPTION_KINDS),
      a: fc.integer({ min: -6, max: 30 }),
      len: fc.integer({ min: 1, max: 10 }),
    });
    fc.assert(
      fc.property(fc.array(arbExc, { maxLength: 8 }), fc.integer({ min: 0, max: 1000 }), (raw, seed) => {
        const exceptions = raw.map((r, i) => ({
          id: `p${i}`, unitId: 'u1', kind: r.kind, origin: 'USER' as const,
          startAt: new Date(t0 + r.a * H).toISOString(), endAt: new Date(t0 + (r.a + r.len) * H).toISOString(),
        }));
        const out = resolveAvailability({ schedules: [daily], exceptions, timeZone: TZ, range: day });
        for (let i = 0; i < out.length; i++) {
          expect(out[i].end).toBeGreaterThan(out[i].start);
          expect(out[i].start).toBeGreaterThanOrEqual(day.start);
          expect(out[i].end).toBeLessThanOrEqual(day.end);
          if (i > 0) expect(out[i].start).toBeGreaterThan(out[i - 1].end);
        }
        const shuffled = [...exceptions].sort((x, y) => ((x.id.charCodeAt(1) * 31 + seed) % 7) - ((y.id.charCodeAt(1) * 31 + seed) % 7));
        expect(resolveAvailability({ schedules: [daily], exceptions: shuffled, timeZone: TZ, range: day })).toEqual(out);
        expect(resolveAvailability({ schedules: [daily], exceptions: [...exceptions].reverse(), timeZone: TZ, range: day })).toEqual(out);
      }),
    );
  });
});
