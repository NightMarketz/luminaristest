import { splitCents } from '../splitCents';

describe('splitCents — F-DFE-16 (b) N-ária, residue-on-last', () => {
  it('splits proportionally to the weights, exact sum', () => {
    const shares = splitCents(1000, [3, 1]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(shares).toEqual([750, 250]);
  });

  it('lands the rounding residue on the LAST share (never lost, never on the first)', () => {
    // 1001 cents split 1:1:1 -> 333.67 each; residue must make the sum exact.
    const shares = splitCents(1001, [1, 1, 1]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1001);
    expect(shares[0]).toBe(334); // round(1001/3) = 334
    expect(shares[1]).toBe(334);
    expect(shares[2]).toBe(333); // 1001 - 334 - 334
  });

  it('a header discount that does not divide evenly still sums exact (mixed fixture class)', () => {
    // Two cTribNac groups weighted 251.99 and 123.45 (a total that never divides cleanly by 100).
    const shares = splitCents(37544, [25199, 12345]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(37544);
  });

  it('single weight returns the total untouched', () => {
    expect(splitCents(500, [1])).toEqual([500]);
  });

  it('all-zero weights falls back to the first element (documented ceiling)', () => {
    expect(splitCents(500, [0, 0])).toEqual([500, 0]);
  });

  it('empty weights returns empty', () => {
    expect(splitCents(500, [])).toEqual([]);
  });
});
