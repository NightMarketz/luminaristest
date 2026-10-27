import type { ISchemaField } from '../../dynamicTables/models/DynamicTable.model';
import { CoreSystemPreset, type PresetSuite, type PresetTableDefinition } from '../../dynamicTables/presets';
import { composeModuleTables, type ModuleKey } from '../../dynamicTables/presets/modules/registry';
import { resolveModuleSelection } from '../../dynamicTables/presets/modules/moduleSelection';
import type { CustomCreationDraft } from '../dtos/CustomCreationDraft.dto';
import type { ICustomizationState } from '../models/InterviewTypes';

/**
 * W1 (BRIEF `docs/accounting/W1-WIZARD-CUSTOM-CREATE-brief.md`) — regras puras da sessão de customização × create
 * custom. Sem I/O: o `CustomizationService` carrega a sessão e o preset; o create (`handleCustomCreation`) segue sendo
 * a autoridade e revalida tudo.
 */

type SessionPreset = Pick<PresetSuite, 'tables' | 'modules'>;

/**
 * F-W1-6 (a): as tabelas que a sessão customiza — as dos módulos instalados e as da suíte, na mesma precedência do
 * create (a suíte sobrepõe o módulo de mesma chave). O Core fica fora: a sessão nunca o mostrou.
 */
export function composeSessionTables(
  preset: SessionPreset,
  modules: readonly ModuleKey[],
): Record<string, PresetTableDefinition> {
  return { ...composeModuleTables(modules), ...preset.tables };
}

/**
 * Item 2 (+ F-W1-4 a, F-W1-6 a). Consolida a sessão no `creation` do create custom:
 * - `removedTables`: tabelas que o create instalaria (suíte ∪ módulos que ele resolve a partir de `state.modules`) e
 *   que não estão selecionadas na sessão — ausente (removida na conversa) ou `isSelected:false` (dono, questionário
 *   2026-10-24: "Ausente conta"). Core nunca.
 * - `addedFields[t]`: campos de `t` cujo nome não está na definição da tabela.
 * - `addedTables`: tabelas criadas na conversa (sem `lock`, fora da definição e do Core), com todos os campos.
 *
 * F-W1-5 (a) mora na sessão (`StateManager.removeTable` tira o módulo inteiro), então a remoção sai aqui sempre por
 * módulo inteiro. Sessão anterior ao W1 (`modules` ausente) só conhece as tabelas da suíte: os módulos ficam fora da
 * consolidação e o create os instala como o front mandar.
 */
export function toCustomCreation(state: ICustomizationState, preset: SessionPreset): CustomCreationDraft {
  const known =
    state.modules === undefined
      ? { ...preset.tables }
      : composeSessionTables(preset, resolveModuleSelection(state.modules, preset.modules ?? []));
  const coreKeys = new Set(Object.keys(CoreSystemPreset.tables));
  const selected = new Map(state.tables.filter((t) => t.isSelected).map((t) => [t.key, t]));

  const removedTables = Object.keys(known).filter((k) => !coreKeys.has(k) && !selected.has(k));

  const addedFields: Record<string, ISchemaField[]> = {};
  for (const [key, table] of selected) {
    const def = known[key];
    if (!def) continue;
    const declared = new Set(def.schema.fields.map((f) => f.name));
    const extra = (table.fields ?? []).filter((f) => !declared.has(f.name));
    if (extra.length > 0) addedFields[key] = extra;
  }

  const addedTables: CustomCreationDraft['addedTables'] = [...selected.values()]
    .filter((t) => t.lock === undefined && !known[t.key] && !coreKeys.has(t.key))
    .map((t): CustomCreationDraft['addedTables'][number] => ({ key: t.key, name: t.name, fields: t.fields ?? [] }));

  return { mode: 'custom', presetKey: state.presetKey, removedTables, addedFields, addedTables };
}
