import { jsonBigintReplacer } from '../jsonBigintReplacer';

describe('jsonBigintReplacer (F-W2B-3)', () => {
  it('passes non-bigint values through untouched', () => {
    expect(jsonBigintReplacer('name', 'Fornecedor X')).toBe('Fornecedor X');
    expect(jsonBigintReplacer('count', 42)).toBe(42);
    expect(jsonBigintReplacer('active', true)).toBe(true);
    expect(jsonBigintReplacer('deletedAt', null)).toBeNull();
  });

  it('converts a bigint *Cents value to number, exact round-trip', () => {
    expect(jsonBigintReplacer('debitCents', 1500n)).toBe(1500);
    expect(typeof jsonBigintReplacer('debitCents', 1500n)).toBe('number');
  });

  it('round-trips a value above the pre-migration Int32 ceiling (ACC-INCR6-J-001)', () => {
    const aboveInt32 = 2_147_483_647 + 1; // one leg > R$ 21.47M
    expect(jsonBigintReplacer('creditCents', BigInt(aboveInt32))).toBe(aboveInt32);
  });

  it('throws loud instead of silently truncating above Number.MAX_SAFE_INTEGER', () => {
    const tooLarge = BigInt(Number.MAX_SAFE_INTEGER) + 10n;
    expect(() => jsonBigintReplacer('amountCents', tooLarge)).toThrow(/MAX_SAFE_INTEGER/);
  });

  it('actually drives JSON.stringify end-to-end (the real call site, not just the pure fn)', () => {
    const payload = { id: 'p1', debitCents: 3_000_000_000n, creditCents: 0n, nested: { amountCents: 500n } };
    const json = JSON.stringify(payload, jsonBigintReplacer);
    expect(JSON.parse(json)).toEqual({ id: 'p1', debitCents: 3_000_000_000, creditCents: 0, nested: { amountCents: 500 } });
  });

  it('JSON.stringify without the replacer still throws (proves the replacer is load-bearing)', () => {
    expect(() => JSON.stringify({ debitCents: 100n })).toThrow(/serialize a BigInt/);
  });
});
