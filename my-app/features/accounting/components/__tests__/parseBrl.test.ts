import { describe, it, expect } from 'vitest';
import { parseBrl } from '../../lib/parseBrl';

// Money path — a wrong parse books a wrong ledger amount. Cover BR format,
// the US dot-decimal footgun, and the lone-dot-as-thousands case.
describe('parseBrl → integer cents', () => {
  it.each([
    ['1.234,56', 123456], // BR: dots thousands, comma decimal (naive replace booked R$ 1,23)
    ['1.234.567,89', 123456789], // multiple thousands groups
    ['1234,56', 123456],
    ['19,99', 1999],
    ['1000', 100000],
    ['1.000', 100000], // lone dot, 3 trailing → thousands (not 1.0)
    ['1.000,00', 100000],
    ['1234.56', 123456], // US dot-decimal tolerated (no 100× error)
    ['19.99', 1999],
    ['1.5', 150],
    // Both separators: the LAST one is the decimal. Reading US as BR booked 123.
    ['1,234.56', 123456],
    ['1,234,567.89', 123456789],
    ['1,234,567', 123456700], // 2+ commas cannot be a decimal → thousands
    ['1,234', 123], // single comma stays BR decimal (R$ 1,234), not US thousands
    ['', 0],
    ['   ', 0],
  ])('parseBrl(%j) === %i', (input, expected) => {
    expect(parseBrl(input)).toBe(expected);
  });
});
