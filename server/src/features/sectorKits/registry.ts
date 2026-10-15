import type { SectorKitV1 } from './dtos/SectorKitDto';
import type { KitCatalogEntry, KitRegistry } from './models/kitTypes';
import { BEAUTY_SALON_KIT_V1 } from './kits/beautySalon/kit.v1';
import { BEAUTY_SALON_KIT_V2 } from './kits/beautySalon/kit.v2';
import { BEAUTY_SALON_KIT_V3 } from './kits/beautySalon/kit.v3';
import { BEAUTY_SALON_KIT_V4 } from './kits/beautySalon/kit.v4';
import { BEAUTY_SALON_KIT_V5 } from './kits/beautySalon/kit.v5';
import { BEAUTY_SALON_KIT_V6 } from './kits/beautySalon/kit.v6';
import { AESTHETIC_CLINIC_KIT_V1 } from './kits/aestheticClinic/kit.v1';
import { AESTHETIC_CLINIC_KIT_V2 } from './kits/aestheticClinic/kit.v2';
import { AESTHETIC_CLINIC_KIT_V3 } from './kits/aestheticClinic/kit.v3';
import { AESTHETIC_CLINIC_KIT_V4 } from './kits/aestheticClinic/kit.v4';
import { AESTHETIC_CLINIC_KIT_V5 } from './kits/aestheticClinic/kit.v5';
import { AESTHETIC_CLINIC_KIT_V6 } from './kits/aestheticClinic/kit.v6';

/**
 * `KIT_REGISTRY` — `kitKey → versões em ordem crescente` (BE-INCR-KIT-SETOR, PR-1, item 4).
 * Fonte única dos setores: o `SECTOR_BINDING_REGISTRY` do `accountingBinding` é derivado daqui.
 * Kit novo ou versão nova entra num lugar só: o array do seu `kitKey`.
 */
export const KIT_REGISTRY: KitRegistry = {
  beautySalon: [BEAUTY_SALON_KIT_V1, BEAUTY_SALON_KIT_V2, BEAUTY_SALON_KIT_V3, BEAUTY_SALON_KIT_V4, BEAUTY_SALON_KIT_V5, BEAUTY_SALON_KIT_V6],
  aestheticClinic: [AESTHETIC_CLINIC_KIT_V1, AESTHETIC_CLINIC_KIT_V2, AESTHETIC_CLINIC_KIT_V3, AESTHETIC_CLINIC_KIT_V4, AESTHETIC_CLINIC_KIT_V5, AESTHETIC_CLINIC_KIT_V6],
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

/**
 * Registro de eventos de negócio (BE-INCR-KIT-SETOR PR-6, item 47): toda chave que algum kit, em qualquer versão,
 * declara no `operationalSchema` (= `emittableEventKeys`, F4). A Factory entrega ao `AccountingSyncService`, que com
 * ele distingue `UNKNOWN_EVENT_KEY` de `NO_MAPPER_FOR_UNIT`. Versão antiga entra: unidade parada nela emite as chaves dela.
 */
export function declaredEventKeys(registry: KitRegistry = KIT_REGISTRY): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const versions of Object.values(registry)) {
    for (const kit of versions) for (const key of Object.keys(kit.operationalSchema)) keys.add(key);
  }
  return keys;
}
