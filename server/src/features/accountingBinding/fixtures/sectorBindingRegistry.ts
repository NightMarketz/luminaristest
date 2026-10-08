import type { AccountingBindingV1 } from '../dtos/AccountingBindingDto';
import { KIT_REGISTRY, latestKit } from '../../sectorKits/registry';

/**
 * Registry `sectorKey → {binding, operationalSchema}` — o binding PADRÃO de cada setor.
 *
 * Nasceu dentro de `jobs/activateAccountingBindingCli.ts` (BE-INCR-P2-VERTICAL-CLINICA, F-P2-7 → a:
 * antes dele `--sector-key` trocava só o rótulo e compilava SEMPRE o binding do salão). Extraído
 * para cá pela LAC-B (FE-INCR-BINDING-ACTIVATION, item 1: `POST /accounting-binding/activate-default`
 * "embute fixture + snapshot server-side") — o CLI e o endpoint leem o MESMO registry, então um
 * setor novo entra num lugar só.
 *
 * Desde o BE-INCR-KIT-SETOR (PR-1, item 4) é DERIVADO do `KIT_REGISTRY` (`features/sectorKits`):
 * cada setor aponta para o binding + schema operacional da versão vigente do seu kit. Mesmo shape,
 * mesma ordem; o setor novo entra agora pelo kit.
 */
export interface SectorBindingEntry {
  binding: AccountingBindingV1;
  operationalSchema: Record<string, unknown>;
}

export const SECTOR_BINDING_REGISTRY: Readonly<Record<string, SectorBindingEntry>> = Object.fromEntries(
  Object.keys(KIT_REGISTRY).map((kitKey) => {
    const kit = latestKit(kitKey)!;
    return [kit.binding.sectorKey, { binding: kit.binding, operationalSchema: kit.operationalSchema }];
  }),
);

/** Setor usado quando quem chama não informa `sectorKey` (mesmo default do CLI). */
export const DEFAULT_SECTOR_KEY = 'beautySalon';
