import { CoreSystemPreset, tablePresetSuites, type PresetTableDefinition } from '..';
import { composeModuleTables, MODULE_KEYS } from '../modules/registry';
import { resolveModuleSelection } from '../modules/moduleSelection';

/**
 * TESTE-ACOPLAMENTO-PRESET (docs/accounting/TESTE-ACOPLAMENTO-PRESET-brief.md) — tipos e universo compartilhados
 * pelos testes de acoplamento preset↔schema. Só teste: nada aqui é exportado para a aplicação.
 *
 * F-TAP-1 → (b): o universo é cada suíte instalável (Core + módulos default da suíte + tabelas da suíte, na mesma
 * ordem de spread do `dashboardController.createDashboardFromPreset`) e, além dela, Core + cada módulo do
 * `MODULE_REGISTRY` isolado (fechado pelas dependências) — módulo instalável sozinho pode citar tabela que só existe
 * com outro.
 */

export const PRESET_REF = '@@PRESET_TABLE_KEY::';
export const SELF_REF = '@@TABLE_SELF@@';

export type Tables = Record<string, PresetTableDefinition>;
export type Universe = { name: string; tables: Tables };

export type CouplingFinding = {
  suite: string;
  table: string;
  source: 'rule' | 'relation' | 'select-default' | 'analytics' | 'plugin-write' | 'plugin-select-value';
  ruleKind?:
    | 'compositeUnique'
    | 'immutableAfter'
    | 'compare'
    | 'lifecycle'
    | 'noOverlap'
    | 'requiredIf'
    | 'deleteConstraints'
    | 'defaultDisplayField';
  ref: string;
  target: string;
};

export type KnownGap = {
  key: string;
  owner: 'FIX-PLUGINS-VENDA' | 'FIX-ANALYTICS-RESIDUO';
  since: '2026-10-21';
};

export function suiteUniverse(name: string, suite: { tables: Tables; modules?: readonly (typeof MODULE_KEYS)[number][] }): Universe {
  return {
    name,
    tables: {
      ...CoreSystemPreset.tables,
      ...composeModuleTables(resolveModuleSelection([], suite.modules ?? [])),
      ...suite.tables,
    },
  };
}

export function buildUniverses(): Universe[] {
  const out: Universe[] = [];
  for (const suites of Object.values(tablePresetSuites)) {
    for (const [suiteKey, suite] of Object.entries(suites)) {
      out.push(suiteUniverse(suiteKey, suite));
    }
  }
  for (const key of MODULE_KEYS) {
    out.push({
      name: `module:${key}`,
      tables: { ...CoreSystemPreset.tables, ...composeModuleTables(resolveModuleSelection([key])) },
    });
  }
  return out;
}

export function resolveTableRef(ref: string | undefined, selfKey: string): string | undefined {
  if (!ref) return undefined;
  if (ref === SELF_REF) return selfKey;
  if (ref.startsWith(PRESET_REF)) return ref.slice(PRESET_REF.length);
  return undefined;
}

export function hasField(table: PresetTableDefinition | undefined, name: string): boolean {
  return !!table && table.schema.fields.some((f) => f.name === name);
}

export function findingKey(f: CouplingFinding): string {
  return `${f.source}:${f.suite}.${f.table}:${f.ref}`;
}

export function describeFinding(f: CouplingFinding): string {
  const kind = f.ruleKind ? `/${f.ruleKind}` : '';
  return `${findingKey(f)}${kind} → '${f.ref}' não existe em '${f.target}'`;
}

/**
 * Item 8 do BRIEF (F-TAP-4 → a): divergência real não corrigida vai para `KNOWN_GAPS` com o nó dono. Devolve o
 * relatório das divergências novas e o das entradas de `KNOWN_GAPS` que já não divergem (a lista só encolhe).
 */
export function partitionByKnownGaps(
  findings: readonly CouplingFinding[],
  knownGaps: readonly KnownGap[],
): { unexpected: string[]; stale: string[] } {
  const known = new Set(knownGaps.map((g) => g.key));
  const found = new Set(findings.map(findingKey));
  return {
    unexpected: findings.filter((f) => !known.has(findingKey(f))).map(describeFinding),
    stale: knownGaps.filter((g) => !found.has(g.key)).map((g) => `${g.key} (${g.owner}) já não diverge — remova de KNOWN_GAPS`),
  };
}

/** Item 7 do BRIEF: clone profundo de uma tabela para o caso sintético com typo. */
export function cloneTable(table: PresetTableDefinition): PresetTableDefinition {
  return JSON.parse(JSON.stringify(table)) as PresetTableDefinition;
}
