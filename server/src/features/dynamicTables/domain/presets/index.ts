import { CoreSystemPreset } from './systems/CoreSystemPreset';
import BeautySalonPreset from './systems/BeautySalonPreset';
import AestheticClinicPreset from './systems/AestheticClinicPreset';
import CrmModulePreset from './systems/CrmModulePreset';
import type { SelectablePresetSuite } from './presetTypes';

/**
 * Tipos do preset e pontes contábeis: declarados em `./presetTypes` (arquivo-folha) e reexportados aqui. Quem está
 * dentro de `domain/` importa da folha — importar deste agregador de dentro de uma suíte ou do registro fecha ciclo.
 */
export { BRIDGE_KEYS, bridgeKeySchema, BRIDGE_REQUIRES } from './presetTypes';
export type {
  BridgeKey,
  PresetTableDefinition,
  PresetSuite,
  PresetAiProfile,
  SelectablePresetSuite,
} from './presetTypes';

/**
 * The core system preset that is installed for every user.
 * It is exported separately as it is not a user-selectable option.
 */
export { CoreSystemPreset };

/**
 * A centralized object containing all available table preset suites, organized by category.
 * Each suite represents a complete, interconnected set of tables for a specific business type.
 * This makes it easy for the AI service to discover and use predefined, complex schemas.
 */
export const tablePresetSuites = {
  services: {
    beautySalon: BeautySalonPreset,
    // BE-INCR-P2-VERTICAL-CLINICA — segundo vertical da prova (ADR-P2, F-P2-1 → RATIFICADO).
    aestheticClinic: AestheticClinicPreset,
  },
  sales: {
    crmModule: CrmModulePreset,
  },
} satisfies Record<string, Record<string, SelectablePresetSuite>>;

export type PresetSuiteCategory = keyof typeof tablePresetSuites;
export type PresetSuiteName<T extends PresetSuiteCategory> = keyof (typeof tablePresetSuites)[T];

