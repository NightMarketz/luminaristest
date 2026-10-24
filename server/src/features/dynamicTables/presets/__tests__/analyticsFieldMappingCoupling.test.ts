import { tablePresetSuites } from '..';
import type { AnalyticsConfiguration } from '@/features/analytics/core/models/AnalyticsConfiguration';
import {
  buildUniverses,
  cloneTable,
  findingKey,
  hasField,
  partitionByKnownGaps,
  resolveTableRef,
  type CouplingFinding,
  type KnownGap,
  type Universe,
} from './presetCouplingUniverse';

/**
 * GAP-MAP Nível 5 — acoplamento preset de analytics ↔ schema real da tabela que ele lê.
 *
 * Nenhum teste ligava o `fieldMapping`/`params` dos presets de analytics aos campos das tabelas de
 * módulo: `AnalyticsValidator` só loga e `AnalyticsService` descarta o resultado. Foi assim que
 * `cashflowKpis` (SalesModule, bloco "4. CAIXA") mandou `expenseDateField: 'date'` para uma tabela
 * `expenses` que só tem `paymentDate`/`dueDate` — o processador descartava TODA despesa e "Contas a
 * Pagar Total/Vencidas" e "Prazo Médio de Pagamento" saíam 0 (Liquidez virava a sentinela 999).
 *
 * Regra: todo `*Field` de `fieldMapping` ou de `params` (valor string, sem caminho pontuado de join)
 * tem de existir em `schema.fields` da tabela que o processador lê para aquele prefixo.
 *
 * TESTE-ACOPLAMENTO-PRESET item 5 (docs/accounting/TESTE-ACOPLAMENTO-PRESET-brief.md) estende a regra: (a) todo
 * `*Field` dentro de `params.pipeline` existe na tabela `pipeline.source`, e `alias.campo` resolve pelo
 * `joins[].alias` (ou por campo `relation` homônimo na tabela-base) e é checado na tabela-alvo; (b) todo campo de
 * `options.importantFields`/`defaultImportantFields` existe na tabela do `tableKey` (ACHADOS-2026-10-19 §3.2 #16).
 * O universo é o de F-TAP-1 (b): cada suíte instalável e cada módulo isolado. O validador de runtime (§3.2 #15)
 * fica no FIX-ANALYTICS-RESIDUO (F-TAP-5 → a).
 */

/** prefixo do `*Field` → chaves de `params` que apontam a tabela lida por esse grupo de campos. */
const PREFIX_TO_TABLE_KEY_PARAMS: Array<[prefix: string, params: string[]]> = [
  ['expense', ['costSourceTableKey', 'expensesTableKey']],
  ['header', ['headerTableKey']],
  ['stock', ['stockMovementsTableKey']],
];

/** Campo de sistema de toda linha do motor (não é declarado em `schema.fields`). */
const ROW_ID = 'id';

/** F-TAP-4 → (a): vermelhos conhecidos com o nó dono; a lista só encolhe. */
const ANALYTICS_RESIDUO = { owner: 'FIX-ANALYTICS-RESIDUO', since: '2026-10-21' } as const;

const KNOWN_GAPS: readonly KnownGap[] = [
  // ACHADOS-2026-10-19 §3.2 #16: `costKpis` lista `status`, que `expenses` não declara.
  { key: 'analytics:beautySalon.expenses:costKpis:importantFields=status', ...ANALYTICS_RESIDUO },
  { key: 'analytics:aestheticClinic.expenses:costKpis:importantFields=status', ...ANALYTICS_RESIDUO },
  // Mesma classe (#16), achado por este teste: o KPI "Contas a Pagar Total" do `cashflowKpis` lista `amount` (campo de
  // `expenses`) junto com `date` (campo de `sales`) — órfão em `sales`, e `date` seria órfão em `expenses`.
  { key: 'analytics:beautySalon.sales:cashflowKpis:importantFields=amount', ...ANALYTICS_RESIDUO },
  { key: 'analytics:aestheticClinic.sales:cashflowKpis:importantFields=amount', ...ANALYTICS_RESIDUO },
];

function targetTableFor(key: string, config: AnalyticsConfiguration, selfKey: string): string | undefined {
  const params = (config.params ?? {}) as Record<string, unknown>;
  for (const [prefix, tableKeyParams] of PREFIX_TO_TABLE_KEY_PARAMS) {
    if (!key.startsWith(prefix)) continue;
    for (const p of tableKeyParams) {
      const resolved = resolveTableRef(params[p] as string | undefined, selfKey);
      if (resolved) return resolved;
    }
  }
  return resolveTableRef((config as unknown as { tableKey?: string }).tableKey, selfKey) ?? selfKey;
}

type PipelineJoin = { leftField?: string; rightField?: string; alias?: string; rightRef?: { key?: string } };
type Pipeline = { source?: { key?: string }; joins?: PipelineJoin[] } & Record<string, unknown>;

function collectPipelineFindings(
  u: Universe,
  tableKey: string,
  configKey: string,
  pipeline: Pipeline,
  push: (f: CouplingFinding) => void,
): void {
  const baseKey = resolveTableRef(pipeline.source?.key, tableKey) ?? tableKey;
  const joins = pipeline.joins ?? [];
  const aliasTable = new Map(joins.map((j) => [j.alias ?? '', resolveTableRef(j.rightRef?.key, tableKey)] as const));
  const miss = (ref: string, target: string) =>
    push({ suite: u.name, table: tableKey, source: 'analytics', ref: `${configKey}:${ref}`, target });
  const checkIn = (target: string | undefined, field: string, ref: string) => {
    if (!target || !u.tables[target]) return miss(ref, `${target ?? '?'} (tabela ausente no universo)`);
    if (field !== ROW_ID && !hasField(u.tables[target], field)) miss(ref, target);
  };
  const checkPath = (key: string, value: string) => {
    const dot = value.indexOf('.');
    if (dot < 0) return checkIn(baseKey, value, `${key}=${value}`);
    const alias = value.slice(0, dot);
    const field = value.slice(dot + 1);
    if (aliasTable.has(alias)) return checkIn(aliasTable.get(alias), field, `${key}=${value}`);
    const relation = u.tables[baseKey]?.schema.fields.find((f) => f.name === alias && f.type === 'relation');
    if (!relation) return miss(`${key}=${value}`, `alias '${alias}' sem join nem relação em ${baseKey}`);
    checkIn(resolveTableRef(relation.relation?.targetTable, baseKey), field, `${key}=${value}`);
  };
  for (const j of joins) {
    if (j.leftField) checkIn(baseKey, j.leftField, `leftField=${j.leftField}`);
    if (j.rightField) checkIn(resolveTableRef(j.rightRef?.key, tableKey), j.rightField, `rightField=${j.rightField}`);
  }
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'joins' || k === 'source') continue;
      if (k.endsWith('Field') && typeof v === 'string') checkPath(k, v);
      else walk(v);
    }
  };
  walk(pipeline);
}

function collectAnalyticsFindings(universes: readonly Universe[]): CouplingFinding[] {
  const out: CouplingFinding[] = [];
  const seen = new Set<string>();
  const push = (f: CouplingFinding) => {
    const k = findingKey(f);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(f);
  };
  for (const u of universes) {
    for (const [tableKey, table] of Object.entries(u.tables)) {
      for (const config of table.analytics ?? []) {
        const params = (config.params ?? {}) as Record<string, unknown>;
        // #770: `*Field` top-level de fieldMapping/params, pelo mapa prefixo→tabela.
        for (const source of [config.fieldMapping ?? {}, params]) {
          for (const [key, value] of Object.entries(source)) {
            if (!key.endsWith('Field') || typeof value !== 'string' || value.includes('.')) continue;
            const targetKey = targetTableFor(key, config, tableKey);
            const target = targetKey ? u.tables[targetKey] : undefined;
            const ref = `${config.key}:${key}=${value}`;
            if (!target) push({ suite: u.name, table: tableKey, source: 'analytics', ref, target: `${targetKey ?? '?'} (tabela ausente no universo)` });
            else if (!hasField(target, value)) push({ suite: u.name, table: tableKey, source: 'analytics', ref, target: targetKey! });
          }
        }
        if (params.pipeline && typeof params.pipeline === 'object') {
          collectPipelineFindings(u, tableKey, config.key, params.pipeline as Pipeline, push);
        }
        const options = (config.options ?? {}) as { importantFields?: Record<string, string[]>; defaultImportantFields?: string[] };
        const ownKey = targetTableFor('', config, tableKey) ?? tableKey;
        const important = [...(options.defaultImportantFields ?? []), ...Object.values(options.importantFields ?? {}).flat()];
        for (const field of new Set(important)) {
          if (!hasField(u.tables[ownKey], field)) {
            push({ suite: u.name, table: tableKey, source: 'analytics', ref: `${config.key}:importantFields=${field}`, target: ownKey });
          }
        }
      }
    }
  }
  return out;
}

describe('presets de analytics × schema das tabelas de módulo', () => {
  it('varre pelo menos o bloco cashflowKpis do SalesModule (sanidade do varredor)', () => {
    const sales = tablePresetSuites.services.beautySalon.tables.sales;
    const cashflow = sales.analytics?.find((c) => c.key === 'cashflowKpis');
    expect(cashflow?.params?.expenseDateField).toBeDefined();
    expect(targetTableFor('expenseDateField', cashflow!, 'sales')).toBe('expenses');
  });

  it('todo *Field (top-level, de pipeline e de join pontuado) e todo importantFields existe na tabela lida', () => {
    const { unexpected } = partitionByKnownGaps(collectAnalyticsFindings(buildUniverses()), KNOWN_GAPS);
    expect(unexpected).toEqual([]);
  });

  it('item 7 — o varredor acusa typo sintético em *Field, join pontuado e importantFields', () => {
    const salon = buildUniverses().find((x) => x.name === 'beautySalon')!;
    const items = cloneTable(salon.tables.saleItems);
    const piped = items.analytics!.find((c) => ((c.params as { pipeline?: Pipeline } | undefined)?.pipeline?.joins ?? []).length > 0)!;
    const pipeline = (piped.params as { pipeline: Pipeline }).pipeline;
    (pipeline.dimensions as Array<Record<string, unknown>>)[0].dateField = 'header.dat';
    const expenses = cloneTable(salon.tables.expenses);
    const cost = expenses.analytics!.find((c) => c.key === 'costKpis')!;
    (cost.fieldMapping as Record<string, string>).amountField = 'amout';
    (cost.options as { defaultImportantFields: string[] }).defaultImportantFields.push('categoria');
    const typo: Universe = { name: 'typo', tables: { ...salon.tables, saleItems: items, expenses } };
    const refs = collectAnalyticsFindings([typo]).map((f) => f.ref);
    expect(refs).toEqual(
      expect.arrayContaining([`${piped.key}:dateField=header.dat`, 'costKpis:amountField=amout', 'costKpis:importantFields=categoria']),
    );
  });

  it('item 8 — KNOWN_GAPS de analytics só encolhe', () => {
    expect(partitionByKnownGaps(collectAnalyticsFindings(buildUniverses()), KNOWN_GAPS).stale).toEqual([]);
  });
});
