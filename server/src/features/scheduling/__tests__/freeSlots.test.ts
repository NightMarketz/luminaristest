import fc from 'fast-check';
import { freeSlots, isCovered, mergeIntervals, type Interval } from '../models/availability';

/** BE-INCR-ESCALA-BASE item 6 — horário livre. */
const M = 60_000;
const t = (h: number, m = 0) => Date.parse('2026-12-01T00:00:00Z') + (h * 60 + m) * M;

describe('freeSlots (item 6)', () => {
  it('passo 15, duração 45, ocupado no meio do turno', () => {
    const busy = [{ start: t(12), end: t(13) }];
    const slots = freeSlots([{ start: t(9), end: t(14) }], busy, 45, 15);
    const starts = slots.map((s) => new Date(s.start).toISOString().slice(11, 16));
    // 09:00..11:15 (fim 12:00 não toca o ocupado) e 13:00..13:15 (fim 14:00).
    expect(starts).toEqual(['09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '13:00', '13:15']);
  });

  it('início fora da grade começa no próximo passo', () => {
    const slots = freeSlots([{ start: t(9, 10), end: t(10, 30) }], [], 30, 15);
    expect(slots.map((s) => new Date(s.start).toISOString().slice(11, 16))).toEqual(['09:15', '09:30', '09:45', '10:00']);
  });

  it('propriedade: todo slot passa no isCovered e não toca em busy', () => {
    const arb = fc.array(fc.record({ a: fc.integer({ min: 0, max: 96 }), len: fc.integer({ min: 1, max: 24 }) }), { maxLength: 6 });
    fc.assert(
      fc.property(arb, arb, fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 8 }), (av, bz, dur15, step15) => {
        const toI = (x: { a: number; len: number }) => ({ start: t(0) + x.a * 15 * M, end: t(0) + (x.a + x.len) * 15 * M });
        const available = mergeIntervals(av.map(toI));
        const busy = bz.map(toI);
        for (const s of freeSlots(available, busy, dur15 * 15, step15 * 5)) {
          expect(isCovered(available, s)).toBe(true);
          expect(busy.some((b) => s.start < b.end && b.start < s.end)).toBe(false);
          expect(s.start % (step15 * 5 * M)).toBe(0);
        }
      }),
    );
  });
});
