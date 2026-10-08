import type { SectorKitV1 } from '../dtos/SectorKitDto';

/**
 * Tipos do módulo de kits de setor (BE-INCR-KIT-SETOR, PR-1, item 1).
 *
 * `KitRegistry` guarda as versões de cada kit em ordem crescente de `kitVersion`; a última é a
 * vigente (`latestKit`). `KitCatalogEntry` é o que o wizard lista (item 7).
 */
export type KitRegistry = Readonly<Record<string, readonly SectorKitV1[]>>;

export interface KitCatalogEntry {
  kitKey: string;
  label: string;
  latestVersion: number;
}
