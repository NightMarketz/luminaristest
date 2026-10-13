import { SectorKitV1Schema, type SectorKitV1 } from '../../dtos/SectorKitDto';
import { CLINIC_BINDING_V2, CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT } from '../../../accountingBinding/fixtures/clinicBinding';
import { REFERENCIAL_2025_CANONICO_V2 } from '../_shared/referencial2025Canonico';

/**
 * Kit da clínica estética, v3 — o v2 no plano de contas de 4 níveis (BE-INCR-PLANO-4-NIVEIS, L8 do RUNBOOK-H1;
 * F-L8-7 a, dono 13/10): binding V2 e de-para referencial com os códigos analíticos patrimoniais novos
 * (`RENOMEACAO_CANONICA_L8`). O conteúdo de negócio é o do v2. Publicado: nunca edite este arquivo; uma versão nova é
 * `kit.v4.ts`.
 */
export const AESTHETIC_CLINIC_KIT_V3: SectorKitV1 = SectorKitV1Schema.parse({
  kitKey: 'aestheticClinic',
  kitVersion: 3,
  label: 'Clínica estética',
  changelog: [
    'v1: migração literal do binding padrão da clínica (CLINIC_BINDING_V1), sem conteúdo novo.',
    'v2: referencial 2025 das 15 folhas canônicas (Presumido e Real), o mesmo do salão v2; 3.4 → 3.01.01.01.01.98 por ' +
      'delegação do contador via dono (PROPOSTA-REFERENCIAL-D1-2026-10-10 §0 e §1.1; D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO ' +
      'D-1; D-2026-10-11-QUESTIONARIO-DONO (b); F-KB-9R de 13/10).',
    'v3: plano de contas em 4 níveis — analíticas patrimoniais renomeadas (1.1.1 → 1.1.1.01 etc.) pela ' +
      'REGRA_VALIDA_NIVEL_CONTAS do Manual da ECD L9 (BE-INCR-PLANO-4-NIVEIS; ADR-PLANO-CONTAS-4-NIVEIS); binding V2 e ' +
      'referencial com os códigos novos.',
  ],
  chartExtension: [],
  binding: CLINIC_BINDING_V2,
  operationalSchema: CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT,
  roleDefaults: {},
  serviceFiscalDefaults: [],
  referential: [
    { regime: 'PRESUMIDO', mappingVersion: '2025', entries: REFERENCIAL_2025_CANONICO_V2 },
    { regime: 'REAL', mappingVersion: '2025', entries: REFERENCIAL_2025_CANONICO_V2 },
  ],
});
