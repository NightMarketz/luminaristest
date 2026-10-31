import { ValidationError } from '../../../../lib/errors';
import type { ISchemaField } from '../../models/DynamicTable.model';
import type { PresetSuite, PresetTableDefinition } from '..';
import {
  composeModuleTables,
  MODULE_REGISTRY,
  moduleOfTable,
  suiteModuleOptions,
  type ModuleKey,
  type ModuleRegistry,
} from './registry';

/**
 * BE-INCR-CRM-MODULE-COMPOSITION (I8) — regras puras de seleção de módulos no onboarding.
 * Nenhuma escrita: o controller do create compõe o resultado com o `installPresetAsSystem`.
 */

/** `requiresOneOf` (BRIEF item 4): cada grupo exige pelo menos um módulo do conjunto. Lança `REQUIRES_ONE_OF`. */
function assertRequiresOneOf(present: ReadonlySet<string>, registry: ModuleRegistry): void {
  for (const key of Object.keys(registry)) {
    if (!present.has(key)) continue;
    for (const oneOf of registry[key].requiresOneOf) {
      if (oneOf.some((m) => present.has(m))) continue;
      throw new ValidationError(`O módulo '${key}' exige pelo menos um destes: ${oneOf.join(', ')}.`, {
        reason: 'REQUIRES_ONE_OF',
        module: key,
        oneOf: [...oneOf],
      });
    }
  }
}

/**
 * Comportamento 2. Resolve a seleção final = pedido explícito ∪ default da suíte, fechada pelas dependências.
 * Dependência que é a base FIXA da categoria (CRM-0) entra implicitamente (BRIEF §2.2: "CRM-0 é implícito");
 * dependência não-fixa ausente → 400 com o módulo faltante nomeado. A dependência pode cruzar categorias (BRIEF item 3).
 * Depois de fechar as dependências, `requiresOneOf` é conferido (item 4). Devolve na ordem do registro.
 */
export function resolveModuleSelection(
  requested: readonly ModuleKey[],
  suiteDefaults: readonly ModuleKey[] = [],
  registry: ModuleRegistry = MODULE_REGISTRY,
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
  assertRequiresOneOf(selected, registry);
  return (Object.keys(registry) as ModuleKey[]).filter((k) => selected.has(k));
}

/**
 * BE-INCR-MODULOS-BASE-SUBMODULOS item 11: as tabelas que a suíte instala por padrão (Core fora) — módulos default
 * fechados pelas dependências, com a fonte/trava da suíte, e as tabelas soltas da suíte por cima (precedência do create).
 */
export function composeSuiteDefaultTables(
  suite: Pick<PresetSuite, 'tables' | 'modules' | 'moduleOverrides' | 'lockedModuleTables'>,
): Record<string, PresetTableDefinition> {
  return { ...composeModuleTables(resolveModuleSelection([], suite.modules ?? []), suiteModuleOptions(suite)), ...suite.tables };
}

/**
 * GAP-MAP Nível 3 "CRM-0 instalável pela metade": aplica `removedTables` (Controle Total) aos módulos selecionados.
 * Módulo existe inteiro ou não existe — remover só parte dele → 400 nomeando o módulo: `FIXED_MODULE_PARTIAL` para
 * módulo fixo (#411, inalterado) e `MODULE_PARTIAL` para qualquer outro módulo com mais de uma tabela
 * (BE-INCR-CRM-SUBMODULES item 5, F-SUB-4 → a). Remover módulo mantendo um dependente selecionado → 400
 * `DEPENDENT_MODULE_KEPT` com os dependentes nomeados (item 6, F-SUB-6 → a; sem cascata no servidor). Devolve os
 * módulos com TODAS as tabelas mantidas (o que de fato será instalado), na ordem recebida.
 * BRIEF item 5: sair a base fixa de uma categoria exige que nenhum outro módulo da categoria continue mantido
 * (`DEPENDENT_MODULE_KEPT`, sem cascata), além dos dependentes declarados em `dependsOn`. Item 4: `requiresOneOf`
 * é conferido sobre os mantidos, depois da regra de dependentes.
 */
export function applyModuleRemovals(
  selected: readonly ModuleKey[],
  removedTables: readonly string[],
  registry: ModuleRegistry = MODULE_REGISTRY,
): ModuleKey[] {
  const removed = new Set(removedTables);
  const kept = selected.filter((key) => {
    const { tables, fixed } = registry[key];
    const gone = tables.filter((t) => removed.has(t));
    if (gone.length > 0 && gone.length < tables.length) {
      throw new ValidationError(
        fixed
          ? `O módulo '${key}' é fixo: remova todas as suas tabelas ou nenhuma (removidas: ${gone.join(', ')}).`
          : `O módulo '${key}' existe inteiro ou não existe: remova todas as suas tabelas ou nenhuma (removidas: ${gone.join(', ')}).`,
        { moduleKey: key, removedTables: gone, reason: fixed ? 'FIXED_MODULE_PARTIAL' : 'MODULE_PARTIAL' },
      );
    }
    return gone.length === 0;
  });
  for (const key of selected) {
    if (kept.includes(key)) continue;
    const { fixed, category } = registry[key];
    const dependents = kept.filter(
      (k) => registry[k].dependsOn.includes(key) || (fixed && registry[k].category === category),
    );
    if (dependents.length > 0) {
      throw new ValidationError(
        `O módulo '${key}' não pode ser removido: ${dependents.join(', ')} depende(m) dele e foi(ram) mantido(s).`,
        { reason: 'DEPENDENT_MODULE_KEPT', moduleKey: key, dependents },
      );
    }
  }
  assertRequiresOneOf(new Set(kept), registry);
  return kept;
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

/**
 * Comportamento 11 (F-CRM-8 → a; F-I8-C11 ratificado 2026-09-26). Troca as opções de selects LIVRES na criação.
 * Só campos que JÁ são `select` e estão na allowlist `freeSelects` do módulo; campo texto → 400 nomeado; nenhum
 * tipo de coluna muda. Devolve um NOVO mapa de tabelas (nunca muta a definição compartilhada do preset).
 */
export function applySelectOverrides(
  overrides: Record<string, Record<string, string[]>> | undefined,
  tables: Readonly<Record<string, PresetTableDefinition>>,
): Record<string, PresetTableDefinition> {
  const out: Record<string, PresetTableDefinition> = { ...tables };
  for (const [tableKey, byField] of Object.entries(overrides ?? {})) {
    const def = out[tableKey];
    if (!def) {
      throw new ValidationError(`selectOverrides.${tableKey}: a tabela não será instalada.`, { table: tableKey });
    }
    const moduleKey = moduleOfTable(tableKey);
    const allow = moduleKey ? MODULE_REGISTRY[moduleKey].freeSelects[tableKey] ?? [] : [];
    const fields = def.schema.fields.map((f: ISchemaField) => ({ ...f }));
    for (const [fieldName, options] of Object.entries(byField)) {
      const field = fields.find((f) => f.name === fieldName);
      if (field && field.type !== 'select') {
        throw new ValidationError(
          `selectOverrides.${tableKey}.${fieldName}: o campo é do tipo '${field.type}', não select — override só vale para select.`,
          { table: tableKey, field: fieldName, reason: 'NOT_A_SELECT' },
        );
      }
      if (!field || !allow.includes(fieldName)) {
        throw new ValidationError(
          `selectOverrides.${tableKey}.${fieldName}: campo fora da allowlist de selects livres.`,
          { table: tableKey, field: fieldName, reason: 'NOT_ALLOWLISTED' },
        );
      }
      field.options = [...options];
    }
    out[tableKey] = { ...def, schema: { ...def.schema, fields } };
  }
  return out;
}
