/**
 * BE-INCR-ONBOARDING-ACTIVATION EMENDA 14/10, item 9b — tabela E14.2 (F-I4-6 a, F-I4-7 a, F-I4-8 a; lacuna 15/10
 * "REAL sem setor não deriva"): uma linha por regime × resposta × setor; todo resultado não nulo passa no
 * `UpsertFiscalProfileSchema` (inclusive o `f4` do Simples).
 */
import { UpsertFiscalProfileSchema } from '@/features/accounting/dtos/FiscalProfileDto';
import { deriveUnitFiscalProfile } from '../services/deriveUnitFiscalProfile';

type Regime = Parameters<typeof deriveUnitFiscalProfile>[0];
type Row = [Regime, boolean | null | undefined, string | null, ReturnType<typeof deriveUnitFiscalProfile>];

const SIMPLES = { regimeTributario: 'SIMPLES', icmsContribuinte: false, pisCofinsRegime: 'SIMPLES' } as const;

const ROWS: Row[] = [
  // MEI e SIMPLES: icmsContribuinte forçado a false, qualquer resposta e setor
  ['MEI', undefined, 'beautySalon', SIMPLES],
  ['MEI', true, 'aestheticClinic', SIMPLES],
  ['SIMPLES', null, null, SIMPLES],
  ['SIMPLES', true, 'beautySalon', SIMPLES],
  ['SIMPLES', false, 'crmModule', SIMPLES],
  // PRESUMIDO: cumulativo em todo setor; "não sei" não deriva
  ['PRESUMIDO', false, 'beautySalon', { regimeTributario: 'PRESUMIDO', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO' }],
  ['PRESUMIDO', true, 'aestheticClinic', { regimeTributario: 'PRESUMIDO', icmsContribuinte: true, pisCofinsRegime: 'CUMULATIVO' }],
  ['PRESUMIDO', false, null, { regimeTributario: 'PRESUMIDO', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO' }],
  ['PRESUMIDO', null, 'beautySalon', null],
  ['PRESUMIDO', undefined, 'aestheticClinic', null],
  // REAL: só o salão deriva NAO_CUMULATIVO (F-I4-8 a); clínica e setor desconhecido não derivam
  ['REAL', false, 'beautySalon', { regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'NAO_CUMULATIVO' }],
  ['REAL', true, 'beautySalon', { regimeTributario: 'REAL', icmsContribuinte: true, pisCofinsRegime: 'NAO_CUMULATIVO' }],
  ['REAL', false, 'aestheticClinic', null],
  ['REAL', false, 'crmModule', null],
  ['REAL', false, null, null],
  ['REAL', null, 'beautySalon', null],
  // NAO_SEI e bloco ausente: nada é derivado
  ['NAO_SEI', false, 'beautySalon', null],
  [undefined, undefined, 'beautySalon', null],
];

describe('deriveUnitFiscalProfile (item 9b)', () => {
  it.each(ROWS)('regime %p · icms %p · setor %p', (regime, icms, sector, expected) => {
    const derived = deriveUnitFiscalProfile(regime, icms, sector);
    expect(derived).toEqual(expected);
    if (derived) expect(UpsertFiscalProfileSchema.safeParse({ unitId: 'u1', ...derived }).success).toBe(true);
  });
});
