import { ValidationError } from '../../../../lib/errors';
import type { ISchemaField } from '../../models/DynamicTable.model';
import type { PresetTableDefinition } from '..';
import { MODULE_KEYS, MODULE_REGISTRY, moduleOfTable, type ModuleDef, type ModuleKey } from './registry';

/**
 * BE-INCR-CRM-MODULE-COMPOSITION (I8) — regras puras de seleção de módulos no onboarding.
 * Nenhuma escrita: o controller do create compõe o resultado com o `installPresetAsSystem`.
 */

/**
 * Comportamento 2. Resolve a seleção final = pedido explícito ∪ default da suíte, fechada pelas dependências.
 * Dependência que é a base FIXA da categoria (CRM-0) entra implicitamente (BRIEF §2.2: "CRM-0 é implícito");
 * dependência não-fixa ausente → 400 com o módulo faltante nomeado. Devolve na ordem do registro.
 */
export function resolveModuleSelection(
  requested: readonly ModuleKey[],
  suiteDefaults: readonly ModuleKey[] = [],
  registry: Readonly<Record<ModuleKey, ModuleDef>> = MODULE_REGISTRY,
): ModuleKey[] {
  const selected = new Set<ModuleKey>([...suiteDefaults, ...requested]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const key of [...selected]) {
      for (const dep of registry[key].dependsOn) {
        if (selected.has(dep)) continue;
        if (!registry[dep].fixed) {
          throw new ValidationError(`O módulo '${key}' exige o módulo '${dep}', que não foi selecionado.`, {
            module: key,
            missingModule: dep,
          });
        }
        selected.add(dep);
        grew = true;
      }
    }
  }
  return MODULE_KEYS.filter((k) => selected.has(k));
}

/**
 * Comportamento 10 (F-CRM-7 → a, só na criação). `addedFields` numa tabela de módulo não pode sombrear campo
 * declarado pelo módulo — o que inclui todo select lido por serviço (`leads.status`, `leadStages.type`...), já
 * que eles são campos declarados. Tabela fora de módulo segue a regra anterior (só o DTO de campo).
 */
export function assertAddedFieldsRespectModules(
  addedFields: Record<string, unknown[]>,
  tables: Readonly<Record<string, PresetTableDefinition>>,
): void {
  for (const [tableKey, fields] of Object.entries(addedFields)) {
    const moduleKey = moduleOfTable(tableKey);
    const def = tables[tableKey];
    if (!moduleKey || !def) continue;
    const declared = new Set(def.schema.fields.map((f: ISchemaField) => f.name));
    for (const f of fields) {
      const name = (f as { name?: unknown } | null)?.name;
      if (typeof name === 'string' && declared.has(name)) {
        throw new ValidationError(
          `addedFields.${tableKey}: o campo '${name}' é declarado pelo módulo '${moduleKey}' e não pode ser sobrescrito.`,
          { table: tableKey, field: name, moduleKey },
        );
      }
    }
  }
}
