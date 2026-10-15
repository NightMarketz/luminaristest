import { SectorKitV1Schema, type SectorKitV1 } from '../../dtos/SectorKitDto';
import { SALE_BINDING_V1, SALE_OPERATIONAL_SCHEMA_SNAPSHOT } from '../../../accountingBinding/fixtures/saleBinding';
import { REFERENCIAL_2025_CANONICO } from '../_shared/referencial2025Canonico';
import { CONTAS_FISCAIS, PERFIL_FISCAL_PADRAO, REFERENCIAL_2025_FISCAL } from '../_shared/conteudoFiscalCanonico';

const REFERENCIAL_2025 = [...REFERENCIAL_2025_CANONICO, ...REFERENCIAL_2025_FISCAL];

/**
 * Kit "Salão de beleza", v3 — o v2 + as contas de imposto, as contas-padrão do perfil fiscal e o referencial delas
 * (BE-INCR-KIT-SETOR-EMENDA-1, PR-K2, itens 5, 6 e 8; F-KE-1 a, F-KE-2 a, F-PCB-1R a — dono, 13/10). Salão e clínica
 * sobem juntos (F-KB-9R). A emenda 3.3 (F6) vira a versão seguinte e herda este conteúdo (item 8).
 * Kit com `roleDefaults.fiscalProfile` exige perfil fiscal na unidade antes de instalar (E-5, mantida pelo dono em 13/10).
 * Publicado: nunca edite este arquivo; uma versão nova é `kit.v4.ts`.
 */
export const BEAUTY_SALON_KIT_V3: SectorKitV1 = SectorKitV1Schema.parse({
  kitKey: 'beautySalon',
  kitVersion: 3,
  label: 'Salão de beleza',
  changelog: [
    'v1: migração literal do binding padrão do salão (SALE_BINDING_V1), sem conteúdo novo.',
    'v2: referencial 2025 das 15 folhas canônicas (Presumido e Real); 3.4 → 3.01.01.01.01.98 por delegação do contador ' +
      'via dono (D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO D-1; D-2026-10-11-QUESTIONARIO-DONO (b)).',
    'v3: contas de imposto (2.1.3–2.1.6 a recolher, 3.6.1/3.6.2 PIS/COFINS como dedução da receita, 4.5.1/4.5.2 IRPJ/CSLL), ' +
      'contas-padrão do perfil fiscal (só campo nulo) e o referencial 2025 delas (F-KE-1 a, F-KE-2 a, F-PCB-1R a; dono 13/10).',
  ],
  chartExtension: CONTAS_FISCAIS,
  binding: SALE_BINDING_V1,
  operationalSchema: SALE_OPERATIONAL_SCHEMA_SNAPSHOT,
  roleDefaults: { fiscalProfile: PERFIL_FISCAL_PADRAO },
  serviceFiscalDefaults: [],
  referential: [
    { regime: 'PRESUMIDO', mappingVersion: '2025', entries: REFERENCIAL_2025 },
    { regime: 'REAL', mappingVersion: '2025', entries: REFERENCIAL_2025 },
  ],
});
