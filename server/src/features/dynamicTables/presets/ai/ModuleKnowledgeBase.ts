import { MODULE_REGISTRY, type ModuleDef, type ModuleGroupKey, type ModuleKey } from '../modules/registry';

/**
 * W5 item 8 (c12 do I8): o que a IA da entrevista sabe dos módulos — DERIVADO de `MODULE_REGISTRY`, sem lista à mão.
 * Primeiro consumidor do `aiDescription` de módulo.
 */
export interface IModuleKnowledge {
  key: ModuleKey;
  name: { pt: string; en: string };
  aiDescription: string;
  fixed: boolean;
  dependsOn: ModuleKey[];
  group?: ModuleGroupKey;
}

export function moduleKnowledge(
  registry: Readonly<Record<ModuleKey, ModuleDef>> = MODULE_REGISTRY,
): IModuleKnowledge[] {
  return Object.values(registry).map(({ key, name, aiDescription, fixed, dependsOn, group }) => ({
    key,
    name: { ...name },
    aiDescription,
    fixed,
    dependsOn: [...dependsOn],
    ...(group ? { group } : {}),
  }));
}
