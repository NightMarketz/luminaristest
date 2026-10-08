import type { SectorKitV1 } from './dtos/SectorKitDto';
import type { KitCatalogEntry, KitRegistry } from './models/kitTypes';
import { BEAUTY_SALON_KIT_V1 } from './kits/beautySalon/kit.v1';
import { AESTHETIC_CLINIC_KIT_V1 } from './kits/aestheticClinic/kit.v1';

/**
 * `KIT_REGISTRY` — `kitKey → versões em ordem crescente` (BE-INCR-KIT-SETOR, PR-1, item 4).
 * Fonte única dos setores: o `SECTOR_BINDING_REGISTRY` do `accountingBinding` é derivado daqui.
 * Kit novo ou versão nova entra num lugar só: o array do seu `kitKey`.
 */
export const KIT_REGISTRY: KitRegistry = {
  beautySalon: [BEAUTY_SALON_KIT_V1],
  aestheticClinic: [AESTHETIC_CLINIC_KIT_V1],
};

/** Versão vigente (a última) do kit; `undefined` se o `kitKey` não existe. */
export function latestKit(kitKey: string): SectorKitV1 | undefined {
  const versions = KIT_REGISTRY[kitKey];
  return versions?.[versions.length - 1];
}

/** Catálogo de setores para o wizard (item 7) — sem rota neste PR; o PR-2 consome. */
export function listKits(): KitCatalogEntry[] {
  return Object.keys(KIT_REGISTRY).map((kitKey) => {
    const kit = latestKit(kitKey)!;
    return { kitKey, label: kit.label, latestVersion: kit.kitVersion };
  });
}
