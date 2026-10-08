import {
  ActivateDefaultBindingRequestSchema,
  ActivateDefaultBindingResultSchema,
} from '../ActivateDefaultBindingDto';

describe('ActivateDefaultBindingRequestSchema (LAC-B, contrato de entrada)', () => {
  it('CONTROLE: aceita só unitId (sectorKey e flags opcionais)', () => {
    expect(ActivateDefaultBindingRequestSchema.safeParse({ unitId: 'u1' }).success).toBe(true);
  });

  it('aceita as duas flags da F-B2 (a) e F-I3-1 (a)', () => {
    const r = ActivateDefaultBindingRequestSchema.safeParse({
      unitId: 'u1', sectorKey: 'beautySalon', installChartIfEmpty: true, openCurrentPeriodIfMissing: true,
    });
    expect(r.success).toBe(true);
  });

  it('rejeita unitId ausente ou vazio', () => {
    expect(ActivateDefaultBindingRequestSchema.safeParse({}).success).toBe(false);
    expect(ActivateDefaultBindingRequestSchema.safeParse({ unitId: '' }).success).toBe(false);
  });

  it('.strict(): chave desconhecida é 400, não ignorada (param-aceito-e-ignorado)', () => {
    expect(ActivateDefaultBindingRequestSchema.safeParse({ unitId: 'u1', chart: [] }).success).toBe(false);
  });

  it('flag string "false" não é coagida a boolean (classe z.coerce.boolean)', () => {
    expect(ActivateDefaultBindingRequestSchema.safeParse({ unitId: 'u1', installChartIfEmpty: 'false' }).success).toBe(false);
  });
});

describe('ActivateDefaultBindingResultSchema (LAC-B, contrato de saída)', () => {
  it('aceita Active com versão, already-active e Draft de pré-check sem versão', () => {
    expect(ActivateDefaultBindingResultSchema.safeParse({ status: 'Active', bindingVersion: 1 }).success).toBe(true);
    expect(ActivateDefaultBindingResultSchema.safeParse({ status: 'already-active', bindingVersion: 3 }).success).toBe(true);
    expect(
      ActivateDefaultBindingResultSchema.safeParse({
        status: 'Draft',
        blocking: [{ code: 'ACCOUNTING_PERIOD_NOT_OPEN', period: '2026-09', message: 'x' }],
      }).success,
    ).toBe(true);
  });

  it("period segue 'YYYY-MM' (contrato da emenda I3)", () => {
    const issue = (period: string) => ({ status: 'Draft', blocking: [{ code: 'ACCOUNTING_PERIOD_NOT_OPEN', period, message: 'x' }] });
    expect(ActivateDefaultBindingResultSchema.safeParse(issue('2026/09')).success).toBe(false);
  });

  it('rejeita status fora do enum e chave extra', () => {
    expect(ActivateDefaultBindingResultSchema.safeParse({ status: 'Superseded' }).success).toBe(false);
    expect(ActivateDefaultBindingResultSchema.safeParse({ status: 'Active', extra: 1 }).success).toBe(false);
  });
});

describe('ActivateDefaultBindingResultSchema — kit de setor (BE-INCR-KIT-SETOR PR-2, item 11 e 14)', () => {
  const kit = { kitKey: 'beautySalon', kitVersion: 1, status: 'INSTALLED' };

  it('aceita o `kit` aditivo e o `step` do KIT_INSTALL_STEP_FAILED', () => {
    expect(ActivateDefaultBindingResultSchema.safeParse({ status: 'Active', bindingVersion: 1, kit }).success).toBe(true);
    expect(
      ActivateDefaultBindingResultSchema.safeParse({
        status: 'Draft',
        blocking: [{ code: 'KIT_INSTALL_STEP_FAILED', step: 6, message: 'x' }],
        kit: { ...kit, status: 'FAILED' },
      }).success,
    ).toBe(true);
  });

  it('rejeita status de kit fora do enum, kit com chave extra e step fora de 1..7', () => {
    expect(ActivateDefaultBindingResultSchema.safeParse({ status: 'Active', kit: { ...kit, status: 'OK' } }).success).toBe(false);
    expect(ActivateDefaultBindingResultSchema.safeParse({ status: 'Active', kit: { ...kit, steps: 7 } }).success).toBe(false);
    expect(
      ActivateDefaultBindingResultSchema.safeParse({ status: 'Draft', blocking: [{ code: 'KIT_INSTALL_STEP_FAILED', step: 8, message: 'x' }] }).success,
    ).toBe(false);
  });
});
