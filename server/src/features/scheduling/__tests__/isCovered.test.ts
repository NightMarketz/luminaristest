import { isCovered, type Interval } from '../models/availability';

/** BE-INCR-ESCALA-BASE item 5 — o agendamento cabe inteiro numa faixa. */
const M = 60_000;
const t = (h: number, m = 0) => Date.parse('2026-12-01T00:00:00Z') + (h * 60 + m) * M;
const shift: Interval = { start: t(9), end: t(18) };

describe('isCovered (item 5)', () => {
  it('início igual ao início do turno cabe', () => {
    expect(isCovered([shift], { start: t(9), end: t(10) })).toBe(true);
  });
  it('fim igual ao fim do turno cabe', () => {
    expect(isCovered([shift], { start: t(17), end: t(18) })).toBe(true);
  });
  it('um minuto além do turno não cabe (nas duas pontas)', () => {
    expect(isCovered([shift], { start: t(17), end: t(18, 1) })).toBe(false);
    expect(isCovered([shift], { start: t(8, 59), end: t(10) })).toBe(false);
  });
  it('tem de caber numa faixa só: atravessar um buraco não cabe', () => {
    const split = [{ start: t(9), end: t(12) }, { start: t(13), end: t(18) }];
    expect(isCovered(split, { start: t(11), end: t(14) })).toBe(false);
  });
});

