import { tablePresetSuites } from '../presets';
import { presetModuleViews } from '../presets/modules/registry';

/**
 * Service class for handling business logic related to dashboard presets.
 * It centralizes access to presets, ensuring a single source of truth and easy maintenance.
 */
class PresetService {
  /**
   * Retrieves a summary list of all available presets, suitable for UI display.
   * @returns An array of preset summaries.
   */
  public getAllPresetSummaries() {
    const allPresets = Object.values(tablePresetSuites)
      .flatMap(category => Object.values(category))
      .map(preset => ({
        key: preset.key,
        name: preset.name,
        description: preset.description,
        category: this.findCategoryForPreset(preset.key),
      }));

    return allPresets;
  }

  /**
   * Retrieves the full data for a single preset by its key.
   * @param presetKey The unique key of the preset.
   * @returns The full preset object, or null if not found.
   */
  public getPresetByKey(presetKey: string) {
    for (const category of Object.values(tablePresetSuites)) {
      for (const preset of Object.values(category)) {
        if (preset.key === presetKey) {
          return preset;
        }
      }
    }
    return null;
  }

  /**
   * `GET /dashboard/presets/:key` — o preset cru + `moduleViews` (BE-INCR-CRM-SUBMODULES item 11, F-SUB-8 → a):
   * os módulos do registro que a suíte compõe, com `group`, `fixed`, `tables` e `dependsOn`. Campo ADITIVO: o
   * `modules` (ModuleKey[]) que a suíte já expunha fica como está (BRIEF §7 insumo 3 — sem mudança de shape).
   */
  public getPresetDetailByKey(presetKey: string) {
    const preset = this.getPresetByKey(presetKey);
    if (!preset) return null;
    return { ...preset, moduleViews: presetModuleViews(preset.modules ?? []) };
  }

  /**
   * Finds the category key for a given preset key.
   * @param presetKey The key of the preset to find the category for.
   * @returns The category key as a string, or null if not found.
   */
  private findCategoryForPreset(presetKey: string): string | null {
    for (const [categoryKey, category] of Object.entries(tablePresetSuites)) {
      if (Object.values(category).some(p => p.key === presetKey)) {
        return categoryKey;
      }
    }
    return null;
  }
}

// Export a singleton instance of the service
export const presetService = new PresetService();
