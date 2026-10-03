import { NotFoundError, ValidationError } from '../../../lib/errors';
import { CoreSystemPreset, tablePresetSuites } from '../../dynamicTables/presets';
import type { PresetSuite, PresetTableDefinition } from '../../dynamicTables/presets';
import { composeModuleTables, expandModuleSelectors, type ModuleSelector } from '../../dynamicTables/presets/modules/registry';
import { applySelectOverrides, resolveModuleSelection } from '../../dynamicTables/presets/modules/moduleSelection';
import { validateConfigurations } from '../../analytics/services/AnalyticsValidator';
import type { ITableSchema } from '../../dynamicTables/models/DynamicTable.model';

/** Suíte inexistente. Subclasse própria: o controller mantém o corpo 404 `{ error }` de antes da extração. */
export class UnknownSuiteError extends NotFoundError {
  constructor(suiteKey: string) {
    super(`Preset com chave '${suiteKey}' não encontrado.`);
    Object.setPrototypeOf(this, UnknownSuiteError.prototype);
  }
}

/** Configuração de analytics da suíte inválida. Subclasse própria pelo mesmo motivo (corpo 400 `{ error }`). */
export class InvalidAnalyticsConfigError extends ValidationError {
  constructor(messages: string) {
    super(`Analytics configuration validation failed: ${messages}`);
    Object.setPrototypeOf(this, InvalidAnalyticsConfigError.prototype);
  }
}

export interface QuickPreset {
  preset: { tables: Record<string, PresetTableDefinition> };
  installedModules: string[];
}

/**
 * Montagem do preset do modo Rápido (extraída de `handleQuickCreation`): suíte → módulos selecionados (body ∪ default da
 * suíte, fechado pelas dependências; chave de grupo expande para os membros) → mescla Core + módulos + suíte (permite
 * referências cruzadas via `@@PRESET_TABLE_KEY::`) → overrides de select → validação de analytics. Função pura: não toca o banco.
 */
export function buildQuickPreset(
  suiteKey: string,
  modules: ModuleSelector[],
  selectOverrides?: Record<string, Record<string, string[]>>,
): QuickPreset {
  let selectedPreset: PresetSuite | undefined;
  for (const category in tablePresetSuites) {
    const categoryPresets = tablePresetSuites[category as keyof typeof tablePresetSuites];
    if (Object.prototype.hasOwnProperty.call(categoryPresets, suiteKey)) {
      selectedPreset = categoryPresets[suiteKey as keyof typeof categoryPresets];
      break;
    }
  }
  if (!selectedPreset) throw new UnknownSuiteError(suiteKey);

  const installedModules = resolveModuleSelection(expandModuleSelectors(modules), selectedPreset.modules ?? []);
  const mergedPreset = {
    tables: {
      ...CoreSystemPreset.tables,
      ...composeModuleTables(installedModules),
      ...(selectedPreset.tables || {}),
    },
  };
  // I8 c11 (F-I8-C11): opções de selects livres — só select da allowlist; campo texto → 400 nomeado.
  mergedPreset.tables = applySelectOverrides(selectOverrides, mergedPreset.tables);

  const analyticsConfigs = (selectedPreset as { analytics?: unknown[] }).analytics;
  if (Array.isArray(analyticsConfigs) && analyticsConfigs.length > 0) {
    const tableSchemas = new Map<string, ITableSchema>();
    for (const [key, table] of Object.entries(mergedPreset.tables)) {
      tableSchemas.set(key, table.schema);
    }
    const validation = validateConfigurations(analyticsConfigs as Parameters<typeof validateConfigurations>[0], tableSchemas);
    if (!validation.valid) {
      throw new InvalidAnalyticsConfigError(validation.errors.map((e) => `${e.field}: ${e.message}`).join('; '));
    }
  }

  return { preset: mergedPreset, installedModules };
}
