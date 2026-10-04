import { TaxAssessmentConfirmSchema, TaxAssessmentListQuerySchema, TaxAssessmentPreviewSchema } from '../TaxAssessmentDto';

/** X7 PR-2 (contrato §2): a lógica que o snapshot de shape não vê — refines das deduções e o `.strict()`. */
describe('TaxAssessmentDto', () => {
  const base = { unitId: 'u', anoCalendario: 2026, periodo: 'T01' };

  it('deduções: OUTRA exige documento; IRRF só no IRPJ e CSLL_RETIDA só na CSLL', () => {
    const ded = (d: Record<string, unknown>) => TaxAssessmentPreviewSchema.safeParse({ ...base, deducoes: [{ valorCents: '100', ...d }] }).success;
    expect(ded({ tributo: 'IRPJ', tipo: 'IRRF' })).toBe(true);
    expect(ded({ tributo: 'CSLL', tipo: 'IRRF' })).toBe(false);
    expect(ded({ tributo: 'IRPJ', tipo: 'CSLL_RETIDA' })).toBe(false);
    expect(ded({ tributo: 'CSLL', tipo: 'OUTRA' })).toBe(false);
    expect(ded({ tributo: 'CSLL', tipo: 'OUTRA', documento: 'DARF 123' })).toBe(true);
    expect(ded({ tributo: 'IRPJ', tipo: 'IRRF', valorCents: '1.5' })).toBe(false);
  });

  it('confirmação: a pagar esperado dos 2 tributos; supersedesIds ≤ 2; chave estranha ⇒ inválido', () => {
    const exp = { IRPJ: '0', CSLL: '0' };
    expect(TaxAssessmentConfirmSchema.safeParse({ ...base, expectedAPagarCents: exp }).success).toBe(true);
    expect(TaxAssessmentConfirmSchema.safeParse({ ...base, expectedAPagarCents: { IRPJ: '0' } }).success).toBe(false);
    expect(TaxAssessmentConfirmSchema.safeParse({ ...base, expectedAPagarCents: exp, supersedesIds: ['a', 'b', 'c'] }).success).toBe(false);
    expect(TaxAssessmentConfirmSchema.safeParse({ ...base, expectedAPagarCents: exp, extra: 1 }).success).toBe(false);
  });

  it('query: ano coerced; unitId obrigatório (L-B); período fora de T01..T04 ⇒ inválido', () => {
    expect(TaxAssessmentListQuerySchema.parse({ unitId: 'u', anoCalendario: '2026' }).anoCalendario).toBe(2026);
    expect(TaxAssessmentListQuerySchema.safeParse({ anoCalendario: '2026' }).success).toBe(false);
    expect(TaxAssessmentListQuerySchema.safeParse({ unitId: 'u', anoCalendario: '2026', periodo: 'M01' }).success).toBe(false);
  });
});
