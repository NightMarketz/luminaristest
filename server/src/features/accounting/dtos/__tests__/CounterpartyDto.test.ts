/**
 * CONTRATO DA FRONTEIRA — CounterpartyDto (BRIEF-W2-A). Cobre a parte que `dtoShapeSnapshot.test.ts`
 * NÃO alcança: `.trim()`/`.transform()` são invisíveis ao `z.toJSONSchema()` (memória
 * dto-shape-snapshot-nao-cobre-logica-fina) — este arquivo prova a LÓGICA FINA, não a FORMA.
 */
import { CreateCounterpartySchema } from '../CounterpartyDto';
import { COUNTERPARTY_NAME_MAX_LENGTH } from '../../models/Counterparty.model';

const valid = { unitId: 'unit-1', type: 'SUPPLIER' as const, name: 'ACME' };

describe('CreateCounterpartySchema', () => {
  it('accepts a well-formed payload', () => {
    expect(CreateCounterpartySchema.safeParse(valid).success).toBe(true);
  });

  it('rejects unknown keys (.strict — a typo fails loud, not silently dropped)', () => {
    expect(CreateCounterpartySchema.safeParse({ ...valid, nome: 'ACME' }).success).toBe(false);
  });

  // ------------------------------------------------------------------ comp. 5 — name trim
  it('trims leading/trailing whitespace off `name` at the edge (comp. 5)', () => {
    const parsed = CreateCounterpartySchema.safeParse({ ...valid, name: '  Padaria X  ' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.name).toBe('Padaria X');
  });

  it('the .max(COUNTERPARTY_NAME_MAX_LENGTH) check runs on the TRIMMED value', () => {
    // Exactly at the limit AFTER trim — padding does not count toward the ceiling.
    const exact = 'x'.repeat(COUNTERPARTY_NAME_MAX_LENGTH);
    const padded = `  ${exact}  `;
    const parsed = CreateCounterpartySchema.safeParse({ ...valid, name: padded });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.name).toBe(exact);

    // One char over the limit, even after trim, still rejects.
    expect(CreateCounterpartySchema.safeParse({ ...valid, name: `  ${exact}x  ` }).success).toBe(false);
  });

  it('rejects a name that is only whitespace (trims to empty, fails .min(1))', () => {
    expect(CreateCounterpartySchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
  });

  // ------------------------------------------------------------------ comp. 3 — taxId digit-only
  it('normalizes taxId to digits-only (CNPJ with punctuation)', () => {
    const parsed = CreateCounterpartySchema.safeParse({ ...valid, taxId: '12.345.678/0001-90' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.taxId).toBe('12345678000190');
  });

  it('normalizes taxId to digits-only (CPF with punctuation)', () => {
    const parsed = CreateCounterpartySchema.safeParse({ ...valid, taxId: '123.456.789-01' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.taxId).toBe('12345678901');
  });

  it('leaves taxId undefined when omitted (optional — no forced empty string)', () => {
    const parsed = CreateCounterpartySchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.taxId).toBeUndefined();
  });

  it('accepts an ALREADY-digit-only taxId unchanged, and does NOT enforce a fixed 11/14 length or checksum (fork F-W2A-4)', () => {
    for (const taxId of ['123', '12345678901', '12345678000190', '999999999999999999']) {
      expect(CreateCounterpartySchema.safeParse({ ...valid, taxId }).success).toBe(true);
    }
  });
});
