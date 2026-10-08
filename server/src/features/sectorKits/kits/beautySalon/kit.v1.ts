import { SectorKitV1Schema, type SectorKitV1 } from '../../dtos/SectorKitDto';
import { SALE_BINDING_V1, SALE_OPERATIONAL_SCHEMA_SNAPSHOT } from '../../../accountingBinding/fixtures/saleBinding';

/**
 * Kit do salão, v1 — migração LITERAL de `SALE_BINDING_V1` + `SALE_OPERATIONAL_SCHEMA_SNAPSHOT`
 * (BE-INCR-KIT-SETOR, PR-1, item 3; F-KB-6 → a: sem conteúdo novo, que entra em v2 — F-KB-9 → a).
 * Publicado: nunca edite este arquivo; uma versão nova é `kit.v2.ts` (item 5, `published.json`).
 */
export const BEAUTY_SALON_KIT_V1: SectorKitV1 = SectorKitV1Schema.parse({
  kitKey: 'beautySalon',
  kitVersion: 1,
  label: 'Salão de beleza',
  changelog: ['v1: migração literal do binding padrão do salão (SALE_BINDING_V1), sem conteúdo novo.'],
  chartExtension: [],
  binding: SALE_BINDING_V1,
  operationalSchema: SALE_OPERATIONAL_SCHEMA_SNAPSHOT,
  roleDefaults: {},
  serviceFiscalDefaults: [],
  referential: [],
});
