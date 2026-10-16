import { tablePresetSuites, type SelectablePresetSuite } from '..';

/**
 * Base de conhecimento para a IA, associando chaves de presets a descrições detalhadas.
 * Essas descrições são otimizadas para busca semântica, permitindo que a IA encontre o preset
 * mais relevante com base na descrição do negócio do usuário.
 */

export interface IPresetKnowledge {
  key: string;
  name: string;
  aiDescription: string;
}

/**
 * W5 item 4 (F-W5-1 → b): o KB é DERIVADO do registro de suítes, na ordem do registro — o perfil mora na suíte
 * (`aiProfile`), sem lista à mão. Item 5: a chave do mapa tem de ser igual a `suite.key` (o `buildQuickPreset` resolve
 * pela chave do mapa e o `PresetService` pela `preset.key`; a igualdade faz os dois apontarem para a mesma suíte) — a
 * divergência lança na carga do módulo.
 */
export function deriveKnowledgeBase(
  suites: Record<string, Record<string, SelectablePresetSuite>>,
): IPresetKnowledge[] {
  return Object.values(suites).flatMap((category) =>
    Object.entries(category).map(([mapKey, suite]) => {
      if (suite.key !== mapKey) {
        throw new Error(
          `Suíte '${suite.key}' registrada sob a chave '${mapKey}': a chave do mapa de tablePresetSuites tem de ser igual a suite.key.`,
        );
      }
      return { key: suite.key, name: suite.aiProfile.name, aiDescription: suite.aiProfile.description };
    }),
  );
}

export const presetKnowledgeBase: IPresetKnowledge[] = deriveKnowledgeBase(tablePresetSuites);
