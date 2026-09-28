import type { AccountingBindingV1 } from '../dtos/AccountingBindingDto';
import { SALE_BINDING_V1, SALE_OPERATIONAL_SCHEMA_SNAPSHOT } from './saleBinding';
import { CLINIC_BINDING_V1, CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT } from './clinicBinding';

/**
 * Registry `sectorKey → {binding, operationalSchema}` — o binding PADRÃO de cada setor.
 *
 * Nasceu dentro de `jobs/activateAccountingBindingCli.ts` (BE-INCR-P2-VERTICAL-CLINICA, F-P2-7 → a:
 * antes dele `--sector-key` trocava só o rótulo e compilava SEMPRE o binding do salão). Extraído
 * para cá pela LAC-B (FE-INCR-BINDING-ACTIVATION, item 1: `POST /accounting-binding/activate-default`
 * "embute fixture + snapshot server-side") — o CLI e o endpoint leem o MESMO registry, então um
 * setor novo entra num lugar só.
 */
export interface SectorBindingEntry {
  binding: AccountingBindingV1;
  operationalSchema: Record<string, unknown>;
}

export const SECTOR_BINDING_REGISTRY: Readonly<Record<string, SectorBindingEntry>> = {
  [SALE_BINDING_V1.sectorKey]: { binding: SALE_BINDING_V1, operationalSchema: SALE_OPERATIONAL_SCHEMA_SNAPSHOT },
  [CLINIC_BINDING_V1.sectorKey]: { binding: CLINIC_BINDING_V1, operationalSchema: CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT },
};

/** Setor usado quando quem chama não informa `sectorKey` (mesmo default do CLI). */
export const DEFAULT_SECTOR_KEY = SALE_BINDING_V1.sectorKey;
