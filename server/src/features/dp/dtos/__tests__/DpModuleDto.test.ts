/**
 * BE-INCR-DP-F0-F1 item 15 (PR-1) — fronteira dos DTOs de /api/dp/modules (FEATURE_TEMPLATE §10 nível 2).
 */
import { AtivarModuloSchema, DpIdParamSchema, DpScopeQuerySchema, EncerrarModuloSchema } from '../DpModuleDto';

const ATIVAR = { unitId: 'u1', moduleKey: 'DP-PONTO', competenciaInicio: '2027-03', motivo: 'ponto eletrônico' };

describe('DpModuleDto', () => {
  it('AtivarModuloSchema aceita o mínimo e recusa chave, competência, motivo e campo extra', () => {
    expect(AtivarModuloSchema.safeParse(ATIVAR).success).toBe(true);
    expect(AtivarModuloSchema.safeParse({ ...ATIVAR, moduleKey: 'PES-0' }).success).toBe(false);
    expect(AtivarModuloSchema.safeParse({ ...ATIVAR, competenciaInicio: '2027-13' }).success).toBe(false);
    expect(AtivarModuloSchema.safeParse({ ...ATIVAR, motivo: 'ab' }).success).toBe(false);
    expect(AtivarModuloSchema.safeParse({ ...ATIVAR, motivo: 'x'.repeat(501) }).success).toBe(false);
    expect(AtivarModuloSchema.safeParse({ ...ATIVAR, userId: 'outro' }).success).toBe(false);
    expect(AtivarModuloSchema.safeParse({ ...ATIVAR, unitId: '' }).success).toBe(false);
  });

  it('EncerrarModuloSchema exige competência válida e motivo', () => {
    expect(EncerrarModuloSchema.safeParse({ unitId: 'u1', competenciaFim: '2027-06', motivo: 'fim do contrato' }).success).toBe(true);
    expect(EncerrarModuloSchema.safeParse({ unitId: 'u1', competenciaFim: '2027-6', motivo: 'fim do contrato' }).success).toBe(false);
    expect(EncerrarModuloSchema.safeParse({ unitId: 'u1', competenciaFim: '2027-06' }).success).toBe(false);
  });

  it('DpIdParamSchema exige cuid e DpScopeQuerySchema exige unitId', () => {
    expect(DpIdParamSchema.safeParse({ id: 'nao-e-cuid' }).success).toBe(false);
    expect(DpScopeQuerySchema.safeParse({}).success).toBe(false);
  });
});
