import { SectorKitV1Schema, type SectorKitV1 } from '../../dtos/SectorKitDto';
import { CLINIC_BINDING_V1, CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT } from '../../../accountingBinding/fixtures/clinicBinding';
import { REFERENCIAL_2025_CANONICO } from '../_shared/referencial2025Canonico';

/**
 * Kit da clínica estética, v2 — o v1 + o referencial 2025 das 15 folhas canônicas, o mesmo do salão v2
 * (BE-INCR-KIT-SETOR-EMENDA-1, PR-K1, item 2; F-KB-9R: a clínica v2 alcança o salão, dono 13/10). O binding da clínica
 * usa as mesmas contas do canônico que o do salão, e o de-para é do canônico, não do setor. Só PRESUMIDO e REAL
 * (F-HR-2 a), como no salão. Publicado: nunca edite este arquivo; uma versão nova é `kit.v3.ts`.
 */
export const AESTHETIC_CLINIC_KIT_V2: SectorKitV1 = SectorKitV1Schema.parse({
  kitKey: 'aestheticClinic',
  kitVersion: 2,
  label: 'Clínica estética',
  changelog: [
    'v1: migração literal do binding padrão da clínica (CLINIC_BINDING_V1), sem conteúdo novo.',
    'v2: referencial 2025 das 15 folhas canônicas (Presumido e Real), o mesmo do salão v2; 3.4 → 3.01.01.01.01.98 por ' +
      'delegação do contador via dono (PROPOSTA-REFERENCIAL-D1-2026-10-10 §0 e §1.1; D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO ' +
      'D-1; D-2026-10-11-QUESTIONARIO-DONO (b); F-KB-9R de 13/10).',
  ],
  chartExtension: [],
  binding: CLINIC_BINDING_V1,
  operationalSchema: CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT,
  roleDefaults: {},
  serviceFiscalDefaults: [],
  referential: [
    { regime: 'PRESUMIDO', mappingVersion: '2025', entries: REFERENCIAL_2025_CANONICO },
    { regime: 'REAL', mappingVersion: '2025', entries: REFERENCIAL_2025_CANONICO },
  ],
});
