import { TaxAssessmentConfirmSchema, TaxAssessmentListQuerySchema, TaxAssessmentPreviewSchema } from '../TaxAssessmentDto';

/** X7 Fase A PR-2 (contrato §2) — a lógica fina (refine) que o snapshot de shape não vê. */
const base = { unitId: 'u', anoCalendario: 2026, periodo: 'T01' };

describe('TaxAssessmentDto', () => {
  it('prévia: deducoes default []; .strict(); ano ≥ 2025; período só T01..T04', () => {
    expect(TaxAssessmentPreviewSchema.parse(base).deducoes).toEqual([]);
    expect(TaxAssessmentPreviewSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
    expect(TaxAssessmentPreviewSchema.safeParse({ ...base, anoCalendario: 2024 }).success).toBe(false);
    expect(TaxAssessmentPreviewSchema.safeParse({ ...base, periodo: 'A01' }).success).toBe(false);
  });

  it('dedução: OUTRA exige documento; IRRF só no IRPJ e CSLL_RETIDA só na CSLL; centavos só dígitos', () => {
    const d = (x: Record<string, unknown>) => TaxAssessmentPreviewSchema.safeParse({ ...base, deducoes: [x] }).success;
    expect(d({ tributo: 'IRPJ', tipo: 'IRRF', valorCents: '100' })).toBe(true);
    expect(d({ tributo: 'CSLL', tipo: 'IRRF', valorCents: '100' })).toBe(false);
    expect(d({ tributo: 'IRPJ', tipo: 'CSLL_RETIDA', valorCents: '100' })).toBe(false);
    expect(d({ tributo: 'CSLL', tipo: 'CSLL_RETIDA', valorCents: '100' })).toBe(true);
    expect(d({ tributo: 'CSLL', tipo: 'OUTRA', valorCents: '100' })).toBe(false);
    expect(d({ tributo: 'CSLL', tipo: 'OUTRA', valorCents: '100', documento: 'DARF 123' })).toBe(true);
    expect(d({ tributo: 'IRPJ', tipo: 'IRRF', valorCents: '-1' })).toBe(false);
  });

  it('confirmação: expectedAPagarCents dos 2 tributos; supersedesIds ≤ 2', () => {
    const ok = { ...base, expectedAPagarCents: { IRPJ: '0', CSLL: '0' } };
    expect(TaxAssessmentConfirmSchema.safeParse(ok).success).toBe(true);
    expect(TaxAssessmentConfirmSchema.safeParse({ ...ok, expectedAPagarCents: { IRPJ: '0' } }).success).toBe(false);
    expect(TaxAssessmentConfirmSchema.safeParse({ ...ok, supersedesIds: ['a', 'b', 'c'] }).success).toBe(false);
  });

  it('lista: unitId obrigatório (só escopo — decisão do dono 04/10); ano por coerce; sem chave extra', () => {
    expect(TaxAssessmentListQuerySchema.parse({ unitId: 'u', anoCalendario: '2026' }).anoCalendario).toBe(2026);
    expect(TaxAssessmentListQuerySchema.safeParse({ anoCalendario: '2026' }).success).toBe(false);
    expect(TaxAssessmentListQuerySchema.safeParse({ unitId: 'u', anoCalendario: '2026', x: '1' }).success).toBe(false);
  });
});
