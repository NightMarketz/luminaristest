import { InstallKitInputSchema, KitInstallStepsSchema, KitRefSchema } from '../dtos/KitInstallationDto';

describe('KitInstallationDto (BE-INCR-KIT-SETOR PR-2)', () => {
  it('steps: último passo 0..7 e só os avisos nomeados', () => {
    expect(KitInstallStepsSchema.safeParse({ lastCompletedStep: 0, warnings: [] }).success).toBe(true);
    expect(KitInstallStepsSchema.safeParse({ lastCompletedStep: 7, warnings: ['KIT_REFERENTIAL_SKIPPED_NO_CATALOG'] }).success).toBe(true);
    expect(KitInstallStepsSchema.safeParse({ lastCompletedStep: 8, warnings: [] }).success).toBe(false);
    expect(KitInstallStepsSchema.safeParse({ lastCompletedStep: 1, warnings: ['OUTRO'] }).success).toBe(false);
    expect(KitInstallStepsSchema.safeParse({ lastCompletedStep: 1, warnings: [], extra: 1 }).success).toBe(false);
  });

  it('kit da resposta: status do enum, versão ≥ 1, strict', () => {
    expect(KitRefSchema.safeParse({ kitKey: 'beautySalon', kitVersion: 1, status: 'INSTALLING' }).success).toBe(true);
    expect(KitRefSchema.safeParse({ kitKey: 'beautySalon', kitVersion: 0, status: 'INSTALLED' }).success).toBe(false);
    expect(KitRefSchema.safeParse({ kitKey: 'beautySalon', kitVersion: 1, status: 'Active' }).success).toBe(false);
  });

  it('entrada do install: as duas flags são obrigatórias (o CLI passa false), today data-only', () => {
    const base = { kitKey: 'beautySalon', ano: 2026, installChartIfEmpty: false, openCurrentPeriodIfMissing: false, today: '2026-10-08' };
    expect(InstallKitInputSchema.safeParse(base).success).toBe(true);
    expect(InstallKitInputSchema.safeParse({ ...base, regime: 'SIMPLES' }).success).toBe(true);
    expect(InstallKitInputSchema.safeParse({ ...base, regime: null }).success).toBe(true);
    const { installChartIfEmpty: _omit, ...semFlag } = base;
    expect(InstallKitInputSchema.safeParse(semFlag).success).toBe(false);
    expect(InstallKitInputSchema.safeParse({ ...base, today: '2026-10-08T00:00:00Z' }).success).toBe(false);
    expect(InstallKitInputSchema.safeParse({ ...base, regime: 'LUCRO_REAL' }).success).toBe(false);
  });
});
