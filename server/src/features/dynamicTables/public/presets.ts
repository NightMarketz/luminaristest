/**
 * API pública de `dynamicTables` — presets: suítes, registro de módulos, seleção e trava de remoção
 * (ADR-MODULE-BOUNDARIES §10, F-MBE-3 a; §11.6). É o que service de outra feature importa no lugar de
 * `dynamicTables/domain/presets/**`. Só reexporta por nome; a definição mora em `domain/presets/` e `models/`.
 *
 * Porta executável (não é `*.types.ts`): policy, model e DTO de outra feature usam `./presets.types`.
 */
export { CoreSystemPreset, tablePresetSuites } from '../domain/presets';
export type { BridgeKey, PresetSuite, PresetTableDefinition } from '../domain/presets/presetTypes';
export {
  MODULE_REGISTRY,
  composeModuleTables,
  expandModuleSelectors,
  moduleOfTable,
  suiteModuleOptions,
} from '../domain/presets/modules/registry';
export type { ModuleDef } from '../domain/presets/modules/registry';
export type { ModuleKey, ModuleSelector } from '../models/PresetModuleKeys';
export {
  applySelectOverrides,
  composeSuiteDefaultTables,
  resolveModuleSelection,
} from '../domain/presets/modules/moduleSelection';
export { bridgeRequirementsOfTable, computeTableLocks, describeTableLock } from '../domain/presets/removability';
