import type { z } from 'zod';
import type { UpsertFiscalProfileSchema } from '../../accounting/dtos/FiscalProfileDto';
import type { OnboardingFiscalInput } from '../../accounting/dtos/CompanyFiscalProfileDto';

/** Os 3 campos que o onboarding sabe derivar; o passo 3b junta o `unitId` e passa pelo `UpsertFiscalProfileSchema`
 *  (lacuna 15/10, dono: "Só os 3 campos"). */
export type DerivedUnitFiscalProfile = Pick<
  z.input<typeof UpsertFiscalProfileSchema>,
  'regimeTributario' | 'icmsContribuinte' | 'pisCofinsRegime'
>;

/**
 * Setores em que o Lucro Real deriva `NAO_CUMULATIVO`. F-I4-8 (a): só o salão — o art. 10 da Lei 10.833 lido inteiro
 * não cobre serviço de beleza. A clínica estética fica fora (art. 10, XIII, "a", *"clínica médica"*, ambíguo; o
 * contador informa — E14.7). Setor desconhecido também fica fora (lacuna 15/10, dono: "Não deriva").
 */
const SETORES_REAL_NAO_CUMULATIVO: ReadonlySet<string> = new Set(['beautySalon']);

/**
 * BE-INCR-ONBOARDING-ACTIVATION EMENDA 14/10, item 9b (F-I4-6 a, F-I4-8 a) — o `FiscalProfile` da UNIDADE que o
 * onboarding consegue derivar do regime da empresa, pela tabela E14.2 (dossiê
 * `pesquisas-legais/pis-cofins-regime-por-tributacao`, fontes oficiais D01–D04):
 *
 * | regime        | regimeTributario | pisCofinsRegime | norma                                                         |
 * |---------------|------------------|-----------------|---------------------------------------------------------------|
 * | MEI           | SIMPLES          | SIMPLES         | LC 123/2006 art. 18-A §1º (MEI é optante do Simples); art. 13 IV-V |
 * | SIMPLES       | SIMPLES          | SIMPLES         | Lei 10.637/2002 art. 8º III; Lei 10.833/2003 art. 10 III; LC 123 art. 13 IV-V |
 * | PRESUMIDO     | PRESUMIDO        | CUMULATIVO      | Lei 10.637 art. 8º II; Lei 10.833 art. 10 II                   |
 * | REAL (salão)  | REAL             | NAO_CUMULATIVO  | Lei 10.833 art. 1º; Lei 10.637 art. 1º                         |
 *
 * `icmsContribuinte` não decorre do regime (LC 87/1996 art. 4º): no Simples sai `false` (LC 123 art. 23, o `f4` do
 * `UpsertFiscalProfileSchema`); em PRESUMIDO/REAL vem da resposta do dono (F-I4-7 a).
 *
 * Devolve `null` — nada é criado e a ativação sai `Draft` com `KIT_FISCAL_PROFILE_REQUIRED` — quando: o bloco está
 * ausente ou é `NAO_SEI`; PRESUMIDO/REAL com `icmsContribuinte` "não sei"; REAL fora de `SETORES_REAL_NAO_CUMULATIVO`.
 */
export function deriveUnitFiscalProfile(
  regime: OnboardingFiscalInput['regime'] | undefined,
  icmsContribuinte: boolean | null | undefined,
  sectorKey: string | null | undefined,
): DerivedUnitFiscalProfile | null {
  switch (regime) {
    case 'MEI':
    case 'SIMPLES':
      return { regimeTributario: 'SIMPLES', icmsContribuinte: false, pisCofinsRegime: 'SIMPLES' };
    case 'PRESUMIDO':
      if (icmsContribuinte == null) return null;
      return { regimeTributario: 'PRESUMIDO', icmsContribuinte, pisCofinsRegime: 'CUMULATIVO' };
    case 'REAL':
      if (icmsContribuinte == null || !sectorKey || !SETORES_REAL_NAO_CUMULATIVO.has(sectorKey)) return null;
      return { regimeTributario: 'REAL', icmsContribuinte, pisCofinsRegime: 'NAO_CUMULATIVO' };
    default:
      return null;
  }
}
