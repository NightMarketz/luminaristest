import { SectorKitV1Schema, type SectorKitV1 } from '../../dtos/SectorKitDto';
import { CLINIC_BINDING_V1, CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT } from '../../../accountingBinding/fixtures/clinicBinding';

/**
 * Kit da clínica estética, v1 — migração LITERAL de `CLINIC_BINDING_V1` +
 * `CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT` (BE-INCR-KIT-SETOR, PR-1, item 3; F-KB-6 → a).
 * Publicado: nunca edite este arquivo; uma versão nova é `kit.v2.ts` (item 5, `published.json`).
 */
export const AESTHETIC_CLINIC_KIT_V1: SectorKitV1 = SectorKitV1Schema.parse({
  kitKey: 'aestheticClinic',
  kitVersion: 1,
  label: 'Clínica estética',
  changelog: ['v1: migração literal do binding padrão da clínica (CLINIC_BINDING_V1), sem conteúdo novo.'],
  chartExtension: [],
  binding: CLINIC_BINDING_V1,
  operationalSchema: CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT,
  roleDefaults: {},
  serviceFiscalDefaults: [],
  referential: [],
});
