import { tablePresetSuites, type PresetTableDefinition } from '..';
import type { AnalyticsConfiguration } from '@/features/analytics/core/models/AnalyticsConfiguration';

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
 */

const PRESET_REF = '@@PRESET_TABLE_KEY::';
const SELF_REF = '@@TABLE_SELF@@';

/** prefixo do `*Field` → chaves de `params` que apontam a tabela lida por esse grupo de campos. */
const PREFIX_TO_TABLE_KEY_PARAMS: Array<[prefix: string, params: string[]]> = [
  ['expense', ['costSourceTableKey', 'expensesTableKey']],
  ['header', ['headerTableKey']],
  ['stock', ['stockMovementsTableKey']],
];

type Mismatch = { suite: string; table: string; configKey: string; key: string; value: string; targetTable: string };

function resolveTableRef(ref: string | undefined, selfKey: string): string | undefined {
  if (!ref) return undefined;
  if (ref === SELF_REF) return selfKey;
  if (ref.startsWith(PRESET_REF)) return ref.slice(PRESET_REF.length);
  return undefined;
}

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

function collectMismatches(): Mismatch[] {
  const mismatches: Mismatch[] = [];
  for (const [, suites] of Object.entries(tablePresetSuites)) {
    for (const [suiteKey, suite] of Object.entries(suites)) {
      const tables = suite.tables as Record<string, PresetTableDefinition>;
      for (const [tableKey, table] of Object.entries(tables)) {
        for (const config of table.analytics ?? []) {
          const sources: Array<Record<string, unknown>> = [config.fieldMapping ?? {}, (config.params ?? {}) as Record<string, unknown>];
          for (const source of sources) {
            for (const [key, value] of Object.entries(source)) {
              if (!key.endsWith('Field') || typeof value !== 'string' || value.includes('.')) continue;
              const targetKey = targetTableFor(key, config, tableKey);
              const target = targetKey ? tables[targetKey] : undefined;
              if (!target) {
                mismatches.push({ suite: suiteKey, table: tableKey, configKey: config.key, key, value, targetTable: `${targetKey ?? '?'} (tabela ausente na suíte)` });
                continue;
              }
              const exists = target.schema.fields.some((f) => f.name === value);
              if (!exists) mismatches.push({ suite: suiteKey, table: tableKey, configKey: config.key, key, value, targetTable: targetKey! });
            }
          }
        }
      }
    }
  }
  return mismatches;
}

describe('presets de analytics × schema das tabelas de módulo', () => {
  it('varre pelo menos o bloco cashflowKpis do SalesModule (sanidade do varredor)', () => {
    const sales = tablePresetSuites.services.beautySalon.tables.sales;
    const cashflow = sales.analytics?.find((c) => c.key === 'cashflowKpis');
    expect(cashflow?.params?.expenseDateField).toBeDefined();
    expect(targetTableFor('expenseDateField', cashflow!, 'sales')).toBe('expenses');
  });

  it('todo *Field de fieldMapping/params existe no schema da tabela que o processador lê', () => {
    const mismatches = collectMismatches();
    const report = mismatches.map((m) => `${m.suite}.${m.table}#${m.configKey}: ${m.key}='${m.value}' não existe em '${m.targetTable}'`);
    expect(report).toEqual([]);
  });
});
