import { SectorKitV1Schema, type SectorKitV1 } from '../../dtos/SectorKitDto';
import { SALE_BINDING_V2, SALE_OPERATIONAL_SCHEMA_SNAPSHOT } from '../../../accountingBinding/fixtures/saleBinding';
import { REFERENCIAL_2025_CANONICO_V2 } from '../_shared/referencial2025Canonico';

/**
 * Kit do salão, v3 — o v2 no plano de contas de 4 níveis (BE-INCR-PLANO-4-NIVEIS, L8 do RUNBOOK-H1; F-L8-7 a, dono
 * 13/10): binding V2 e de-para referencial com os códigos analíticos patrimoniais novos (`RENOMEACAO_CANONICA_L8`).
 * O conteúdo de negócio é o do v2. Publicado: nunca edite este arquivo; uma versão nova é `kit.v4.ts`.
 */
export const BEAUTY_SALON_KIT_V3: SectorKitV1 = SectorKitV1Schema.parse({
  kitKey: 'beautySalon',
  kitVersion: 3,
  label: 'Salão de beleza',
  changelog: [
    'v1: migração literal do binding padrão do salão (SALE_BINDING_V1), sem conteúdo novo.',
    'v2: referencial 2025 das 15 folhas canônicas (Presumido e Real); 3.4 → 3.01.01.01.01.98 por delegação do contador ' +
      'via dono (D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO D-1; D-2026-10-11-QUESTIONARIO-DONO (b)).',
    'v3: plano de contas em 4 níveis — analíticas patrimoniais renomeadas (1.1.1 → 1.1.1.01 etc.) pela ' +
      'REGRA_VALIDA_NIVEL_CONTAS do Manual da ECD L9 (BE-INCR-PLANO-4-NIVEIS; ADR-PLANO-CONTAS-4-NIVEIS); binding V2 e ' +
      'referencial com os códigos novos.',
  ],
  chartExtension: [],
  binding: SALE_BINDING_V2,
  operationalSchema: SALE_OPERATIONAL_SCHEMA_SNAPSHOT,
  roleDefaults: {},
  serviceFiscalDefaults: [],
  referential: [
    { regime: 'PRESUMIDO', mappingVersion: '2025', entries: REFERENCIAL_2025_CANONICO_V2 },
    { regime: 'REAL', mappingVersion: '2025', entries: REFERENCIAL_2025_CANONICO_V2 },
  ],
});
