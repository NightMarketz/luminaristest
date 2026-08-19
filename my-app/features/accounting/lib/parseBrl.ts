/**
 * Parse a money input string to integer cents. BR convention: comma is the
 * decimal separator, dots group thousands ("1.234,56" → 123456). Tolerates a
 * US-style dot-decimal ("1234.56", "19.99") only when there is no comma and the
 * dot is followed by 1–2 digits — otherwise a lone dot is a thousands separator
 * ("1.000" → 100000), so a dot typed as decimal never books a 100× entry.
 *
 * When BOTH separators appear the LAST one is the decimal and the other groups
 * thousands — that is what tells "1.234,56" (BR) from "1,234.56" (US). Reading
 * the US form as BR booked R$ 1,23, a 1000× under-entry. Two or more commas
 * cannot be a decimal separator either, so they group thousands ("1,234,567").
 * A single comma stays BR decimal, so "1,234" is R$ 1,234 → 123 cents.
 *
 * Canonical for every accounting money modal — do not re-inline. A naive
 * `s.replace(',', '.')` corrupts thousands input silently ("1.234,56" → R$ 1,23),
 * and since debit and credit share the parser the entry still balances and posts.
 */
export function parseBrl(s: string): number {
  const trimmed = (s || '').trim();
  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');
  let normalised: string;
  if (lastComma >= 0 && lastDot >= 0) {
    normalised =
      lastComma > lastDot
        ? trimmed.replace(/\./g, '').replace(',', '.') // BR "1.234,56"
        : trimmed.replace(/,/g, ''); // US "1,234.56"
  } else if (lastComma >= 0) {
    normalised =
      trimmed.indexOf(',') === lastComma
        ? trimmed.replace(',', '.') // single comma → BR decimal
        : trimmed.replace(/,/g, ''); // 2+ commas → thousands
  } else if (/\.\d{1,2}$/.test(trimmed)) {
    normalised = trimmed; // lone dot with ≤2 trailing digits → decimal point
  } else {
    normalised = trimmed.replace(/\./g, ''); // dots are thousands separators
  }
  const parsed = parseFloat(normalised || '0');
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}
