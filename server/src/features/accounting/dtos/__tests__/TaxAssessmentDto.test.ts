import { TaxAssessmentConfirmSchema, TaxAssessmentListQuerySchema, TaxAssessmentPreviewSchema } from '../TaxAssessmentDto';

/** X7 Fase A PR-2 (contrato §2) — a lógica fina (refine) que o snapshot de shape não vê. */
const base = { unitId: 'u', anoCalendario: 2026, periodo: 'T01' };

describe('TaxAssessmentDto', () => {
  it('prévia: deducoes default []; .strict(); ano ≥ 2025; período fora de T01..T04/A00..A12 recusado', () => {
    expect(TaxAssessmentPreviewSchema.parse(base).deducoes).toEqual([]);
    expect(TaxAssessmentPreviewSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
    expect(TaxAssessmentPreviewSchema.safeParse({ ...base, anoCalendario: 2024 }).success).toBe(false);
    expect(TaxAssessmentPreviewSchema.safeParse({ ...base, periodo: 'T05' }).success).toBe(false); // Fase B: A00..A12 entram (ver abaixo)
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

describe('TaxAssessmentDto — X7 Fase B (item 11; decisão 4 do PR-3)', () => {
  const ok = (x: Record<string, unknown>) => TaxAssessmentPreviewSchema.safeParse({ ...base, ...x }).success;

  it('A00..A12 no enum; modoMensal obrigatório em A01..A12 e proibido nos demais', () => {
    expect(ok({ periodo: 'A01', modoMensal: 'RECEITA_BRUTA' })).toBe(true);
    expect(ok({ periodo: 'A12', modoMensal: 'BALANCETE' })).toBe(true);
    expect(ok({ periodo: 'A01' })).toBe(false);
    expect(ok({ periodo: 'A00' })).toBe(true);
    expect(ok({ periodo: 'A00', modoMensal: 'BALANCETE' })).toBe(false);
    expect(ok({ periodo: 'T01', modoMensal: 'RECEITA_BRUTA' })).toBe(false);
    expect(ok({ periodo: 'A13' })).toBe(false);
  });

  it('estimativasPagas só no A00; (periodo, tributo) repetido ⇒ 400 — vale na confirmação também', () => {
    const p = (periodo: string, tributo = 'IRPJ', valorCents = '1') => ({ periodo, tributo, valorCents });
    expect(ok({ periodo: 'A00', estimativasPagas: [p('A01'), p('A01', 'CSLL'), p('A02')] })).toBe(true);
    expect(ok({ periodo: 'A03', modoMensal: 'RECEITA_BRUTA', estimativasPagas: [p('A01')] })).toBe(false);
    expect(ok({ periodo: 'T04', estimativasPagas: [] })).toBe(false);
    const dup = TaxAssessmentPreviewSchema.safeParse({ ...base, periodo: 'A00', estimativasPagas: [p('A01'), p('A01', 'IRPJ', '2')] });
    expect(dup.success).toBe(false);
    expect(JSON.stringify(dup.error?.issues)).toContain('A01/IRPJ repetido');
    const conf = { ...base, periodo: 'A00', expectedAPagarCents: { IRPJ: '0', CSLL: '0' } };
    expect(TaxAssessmentConfirmSchema.safeParse({ ...conf, estimativasPagas: [p('A05'), p('A05')] }).success).toBe(false);
    expect(TaxAssessmentConfirmSchema.safeParse(conf).success).toBe(true);
    expect(TaxAssessmentPreviewSchema.safeParse({ ...base, periodo: 'A00', estimativasPagas: [p('A00')] }).success).toBe(false); // só meses
  });
});
