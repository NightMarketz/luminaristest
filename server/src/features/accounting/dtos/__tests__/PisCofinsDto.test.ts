/**
 * BE-INCR-PIS-COFINS PR-2 (nó X8, BRIEF contrato §2, itens 12, 16, 21) — os contratos de entrada da prévia/confirmação
 * e a leitura do X7 alargada (`periodo` M01..M12, filtro `tributo`). O snapshot de shape cobre a forma; isto cobre a
 * lógica que ele não vê (mensagem do 2027, defaults, `.strict()`).
 */
import { PisCofinsConfirmSchema, PisCofinsPreviewSchema } from '../PisCofinsDto';
import { TaxAssessmentListQuerySchema } from '../TaxAssessmentDto';

const base = { unitId: 'u1', anoCalendario: 2026, periodo: 'M03' };

describe('PisCofinsPreviewSchema / PisCofinsConfirmSchema', () => {
  it('mínimo válido: listas default vazias, saldoCredorAnterior ausente', () => {
    expect(PisCofinsPreviewSchema.parse(base)).toEqual({ ...base, ajustesBase: [], outrosCreditos: [], retencoes: [] });
  });

  it('2027 ⇒ 400 citando a revogação (LC 214 art. 542); 2024 e período fora de M01..M12 ⇒ 400', () => {
    const r = PisCofinsPreviewSchema.safeParse({ ...base, anoCalendario: 2027 });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.flatten())).toContain('LC 214/2025 art. 542');
    expect(PisCofinsPreviewSchema.safeParse({ ...base, anoCalendario: 2024 }).success).toBe(false);
    for (const periodo of ['A03', 'T01', 'M13', 'M00']) expect(PisCofinsPreviewSchema.safeParse({ ...base, periodo }).success).toBe(false);
  });

  it('.strict() em todos os níveis; centavos só dígitos', () => {
    expect(PisCofinsPreviewSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
    expect(PisCofinsPreviewSchema.safeParse({ ...base, ajustesBase: [{ tipo: 'ALIQUOTA_ZERO_REVENDA', valorCents: '1', x: 1 }] }).success).toBe(false);
    expect(PisCofinsPreviewSchema.safeParse({ ...base, retencoes: [{ tributo: 'PIS', valorCents: '-1' }] }).success).toBe(false);
    expect(PisCofinsPreviewSchema.safeParse({ ...base, retencoes: [{ tributo: 'IRPJ', valorCents: '1' }] }).success).toBe(false);
    expect(PisCofinsPreviewSchema.safeParse({ ...base, outrosCreditos: [{ inciso: 'II_INSUMO', baseCents: '1' }] }).success).toBe(false);
    expect(PisCofinsPreviewSchema.safeParse({ ...base, saldoCredorAnterior: { PIS: '1' } }).success).toBe(false);
  });

  it('confirmação exige expectedAPagarCents {PIS, COFINS}; supersedesIds ≤ 2', () => {
    const ok = { ...base, expectedAPagarCents: { PIS: '0', COFINS: '0' } };
    expect(PisCofinsConfirmSchema.safeParse(ok).success).toBe(true);
    expect(PisCofinsConfirmSchema.safeParse(base).success).toBe(false);
    expect(PisCofinsConfirmSchema.safeParse({ ...ok, expectedAPagarCents: { IRPJ: '0', CSLL: '0' } }).success).toBe(false);
    expect(PisCofinsConfirmSchema.safeParse({ ...ok, supersedesIds: ['a', 'b', 'c'] }).success).toBe(false);
  });
});

describe('TaxAssessmentListQuerySchema (leitura do X7 alargada — itens 12 e 16)', () => {
  it('aceita periodo M01..M12 e tributo PIS/COFINS; mantém os do X7', () => {
    expect(TaxAssessmentListQuerySchema.parse({ unitId: 'u', anoCalendario: '2026', periodo: 'M05', tributo: 'COFINS' })).toMatchObject({ periodo: 'M05', tributo: 'COFINS' });
    expect(TaxAssessmentListQuerySchema.safeParse({ unitId: 'u', anoCalendario: '2026', periodo: 'T01', tributo: 'IRPJ' }).success).toBe(true);
    expect(TaxAssessmentListQuerySchema.safeParse({ unitId: 'u', anoCalendario: '2026', tributo: 'ISS' }).success).toBe(false);
  });
});
