import { logger } from '../../../lib/logger';
import {
  fieldPresetKnowledgeBase,
  IFieldPresetKnowledge,
} from '../../../features/dynamicTables/presets/fields/FieldPresetKnowledgeBase';

/**
 * Casamento determinístico de um campo com o catálogo de presets. A busca semântica por LLM (`findFieldPreset`, a
 * 2ª chamada por turno) saiu no W6 (F-W6-4 a): o casamento semântico vem no `presetKey` do schema do modelo.
 */
export class FieldPresetMatcher {
  /** Chaves do catálogo, na ordem dele — o enum do `presetKey` no schema do modelo. */
  public presetKeys(): string[] {
    return fieldPresetKnowledgeBase.map((p) => p.key);
  }

  /**
   * Busca um preset pelo nome exato da chave ou por sinônimo.
   * @param fieldName Nome do campo a ser buscado (ex: "email", "telefone")
   * @returns A entrada do catálogo ou null se não houver correspondência
   */
  public findExactFieldMatch(fieldName: string): IFieldPresetKnowledge | null {
    const normalizedFieldName = fieldName.toLowerCase().trim();

    const exactMatch = fieldPresetKnowledgeBase.find((preset) => preset.key === normalizedFieldName);
    if (exactMatch) {
      logger.info(`[FieldPresetMatcher] Correspondência exata encontrada para "${fieldName}": ${exactMatch.key}`);
      return exactMatch;
    }

    const synonymMatch = fieldPresetKnowledgeBase.find((preset) =>
      preset.synonyms.some((synonym) => synonym.toLowerCase() === normalizedFieldName),
    );
    if (synonymMatch) {
      logger.info(`[FieldPresetMatcher] Correspondência por sinônimo encontrada para "${fieldName}": ${synonymMatch.key}`);
      return synonymMatch;
    }

    return null;
  }
}
