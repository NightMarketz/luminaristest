import { PostEntryLineSchema, PostEntrySchema } from '../PostingDto';
import { MAX_CENTS } from '../../models/money';

/**
 * ACC-HARDEN-POST-CENTS-001: the direct /post path must reject an over-Int32 cents value at the
 * DTO boundary (a clear 400) instead of letting it fail late in the repository — the same
 * protection the import preview got (ACC-INCR6-J-001). The controller does
 * `PostEntrySchema.safeParse(req.body)` and returns 400 on failure BEFORE PostingService is
 * ever called, so a failed parse here is exactly what keeps the invalid line out of the ledger.
 */
describe('PostingDto — cents Int32 ceiling (ACC-HARDEN-POST-CENTS-001)', () => {
  const line = (debitCents: number, creditCents: number) => ({ accountCode: '1.1.1', debitCents, creditCents });
  const entry = (lines: Array<{ accountCode: string; debitCents: number; creditCents: number }>) => ({
    unitId: 'u1', date: '2026-07-01', description: 'x', lines,
  });

  it('accepts the Int32-max value itself on a leg', () => {
    expect(PostEntryLineSchema.safeParse(line(MAX_CENTS, 0)).success).toBe(true);
    expect(PostEntryLineSchema.safeParse(line(0, MAX_CENTS)).success).toBe(true);
  });

  it('rejects debitCents one cent over Int32 with a clear message', () => {
    const r = PostEntryLineSchema.safeParse(line(MAX_CENTS + 1, 0));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => /excede o limite suportado/.test(i.message))).toBe(true);
    }
  });

  it('rejects creditCents one cent over Int32 with a clear message', () => {
    const r = PostEntryLineSchema.safeParse(line(0, MAX_CENTS + 1));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => /excede o limite suportado/.test(i.message))).toBe(true);
    }
  });

  it('F-W2B-2 → (b): o Int32 deixou de ser o teto — R$ 78 mi numa perna passa no DTO; o teto novo é 2^43−1', () => {
    // O Int32 (2_147_483_647) deixou de ser o teto em 24/11/2026; a coluna é BigInt (ver models/money.ts).
    expect(MAX_CENTS).toBe(8_796_093_022_207);
    expect(PostEntryLineSchema.safeParse(line(7_800_000_000, 0)).success).toBe(true); // R$ 78 mi numa perna
    expect(PostEntryLineSchema.safeParse(line(2_147_483_648, 0)).success).toBe(true); // 1 centavo acima do antigo teto
    expect(PostEntryLineSchema.safeParse(line(Number.MAX_SAFE_INTEGER, 0)).success).toBe(false);
  });

  it('full PostEntrySchema fails when any line exceeds the ceiling (controller → 400, no service call)', () => {
    const bad = entry([line(MAX_CENTS + 1, 0), line(0, 100)]);
    expect(PostEntrySchema.safeParse(bad).success).toBe(false);
  });

  it('full PostEntrySchema passes a balanced pair at the Int32 max', () => {
    const ok = entry([line(MAX_CENTS, 0), line(0, MAX_CENTS)]);
    expect(PostEntrySchema.safeParse(ok).success).toBe(true);
  });
});
