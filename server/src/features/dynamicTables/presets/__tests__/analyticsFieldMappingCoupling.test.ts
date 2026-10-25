import * as fs from 'fs';
import * as path from 'path';
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
 * `joins[].alias` (ou por campo `relation` homônimo na tabela-base) e é checado na tabela-alvo; (b) `importantFields`
 * (ACHADOS-2026-10-19 §3.2 #16) na leitura do runtime — F-TAP-6 → (b), dono, chat, 2026-10-25: a tabela de um KPI é
 * o `tableSource` que o processador emite para ele (o que `resolveChartDetails` usa para buscar os registros);
 * `mixed` = pelo menos uma das duas tabelas; `defaultImportantFields` vale para cada KPI emitido sem entrada própria;
 * a chave de `importantFields` tem de ser nome emitido. Nome → `tableSource` vem do manifesto estático
 * `PROCESSOR_KPI_SOURCES`. O universo é o de F-TAP-1 (b): cada suíte instalável e cada módulo isolado. O validador
 * de runtime (§3.2 #15) fica no FIX-ANALYTICS-RESIDUO (F-TAP-5 → a).
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
const KNOWN_GAPS: readonly KnownGap[] = [];

/**
 * F-TAP-6 → (b): nome de cada KPI emitido → `tableSource`, lido do `return` de cada processador em 2026-10-25.
 * `main` = a tabela do bloco (`table.presetKey`); `expense` = `params[expenseParam] ?? 'expenses'`; `mixed` = as duas
 * (`resolveChartDetails` busca a principal e a de `costSourceTableKey || expensesTableKey`). Só os processadores cujo
 * bloco declara `importantFields`; bloco com `importantFields` e processador fora daqui é divergência.
 */
type KpiSource = 'main' | 'expense' | 'mixed';
type ProcessorKpis = { file: string; expenseParam?: 'expensesTableKey' | 'costSourceTableKey'; kpis: Readonly<Record<string, KpiSource>> };

const allMain = (names: readonly string[]): Record<string, KpiSource> => Object.fromEntries(names.map((n) => [n, 'main']));

const PROCESSOR_KPI_SOURCES: Readonly<Record<string, ProcessorKpis>> = {
  revenueKpis: {
    file: 'revenue/RevenueKpiProcessor.ts',
    kpis: allMain([
      'Receita Bruta', 'Receita Líquida', 'Crescimento da Receita (%)', 'Receita Total Anual', 'Receita Operacional',
      'Receita Não Operacional', 'Receita Média Mensal', 'Receita Média por Dia Útil', 'Receita por Hora Operacional',
      'Receita por Cliente', 'Receita Máxima por Cliente', 'Receita por Categoria',
      'Dependência de Receita de Fonte Única (%)', 'Receita Nova (%)', 'Receita Recorrente (%)',
      'Receita Sazonal (Índice)', 'Receita Atribuída a Campanhas',
    ]),
  },
  profitKpis: {
    file: 'profit/ProfitKpiProcessor.ts',
    expenseParam: 'costSourceTableKey',
    kpis: {
      'Lucro Bruto': 'mixed', 'Lucro Operacional': 'mixed', 'Lucro Líquido': 'mixed', 'Lucro Médio por Cliente': 'main',
      'Lucro por Funcionário': 'mixed', 'Lucro por Hora Trabalhada': 'mixed', 'Margem Bruta (%)': 'mixed',
      'Margem Operacional (%)': 'mixed', 'Margem Líquida (%)': 'mixed', 'Margem de Contribuição (%)': 'mixed',
      'Rentabilidade Geral (%)': 'mixed', 'Crescimento do Lucro (%)': 'main', 'Produtividade do Lucro': 'mixed',
      'Eficiência do Lucro (Lucro/Custo)': 'mixed', 'Índice de Qualidade do Lucro': 'mixed',
      'Resultado Financeiro Final': 'mixed', 'Lucro Ajustado': 'mixed', 'Lucro Acumulado': 'mixed',
    },
  },
  costKpis: {
    file: 'cost/CostKpiProcessor.ts',
    kpis: allMain([
      'Custo Fixo Total', 'Custo Fixo Médio Mensal', 'Participação dos Custos Fixos (%)', 'Custo Variável Total',
      'Custo Variável Médio por Atendimento', 'Participação dos Custos Variáveis (%)', 'Despesas Operacionais Totais',
      'Despesas Administrativas (%)', 'Despesas de Manutenção', 'Despesas Não Recorrentes', 'Impostos Totais Pagos',
      'Custo Total', 'Custo por Dia Útil', 'Custo Não Planejado (%)',
    ]),
  },
  cashflowKpis: {
    file: 'cashflow/CashflowKpiProcessor.ts',
    expenseParam: 'expensesTableKey',
    kpis: {
      'Fluxo de Caixa Operacional': 'mixed', 'Fluxo de Caixa Livre': 'mixed', 'Saldo de Caixa': 'mixed',
      'Contas a Receber Total': 'main', 'Contas a Receber Vencidas': 'main', 'Prazo Médio de Recebimento (dias)': 'main',
      'Contas a Pagar Total': 'expense', 'Contas a Pagar Vencidas': 'expense', 'Prazo Médio de Pagamento (dias)': 'expense',
      'Índice de Liquidez Corrente': 'mixed', 'Índice de Solvência': 'mixed',
    },
  },
};

/** Tabelas de onde `resolveChartDetails` busca os registros de um KPI com esta fonte. */
function kpiTables(source: KpiSource, proc: ProcessorKpis, params: Record<string, unknown>, ownKey: string): string[] {
  const ref = (p: string) => resolveTableRef(params[p] as string | undefined, ownKey);
  const expense = (proc.expenseParam ? ref(proc.expenseParam) : undefined) ?? 'expenses';
  if (source === 'main') return [ownKey];
  if (source === 'expense') return [expense];
  const mixedExpense = ref('costSourceTableKey') ?? ref('expensesTableKey');
  return mixedExpense ? [ownKey, mixedExpense] : [ownKey];
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

/** F-TAP-6 → (b): `importantFields`/`defaultImportantFields` contra a fonte de cada KPI emitido. */
function collectImportantFieldsFindings(
  u: Universe,
  tableKey: string,
  config: AnalyticsConfiguration,
  push: (f: CouplingFinding) => void,
): void {
  const options = (config.options ?? {}) as { importantFields?: Record<string, string[]>; defaultImportantFields?: string[] };
  const entries = options.importantFields ?? {};
  const defaults = options.defaultImportantFields ?? [];
  if (Object.keys(entries).length === 0 && defaults.length === 0) return;
  const finding = (ref: string, target: string) =>
    push({ suite: u.name, table: tableKey, source: 'analytics', ref: `${config.key}:${ref}`, target });
  const proc = PROCESSOR_KPI_SOURCES[String(config.templateKey)];
  if (!proc) return finding('importantFields', `processador '${String(config.templateKey)}' sem manifesto em PROCESSOR_KPI_SOURCES`);
  const params = (config.params ?? {}) as Record<string, unknown>;
  const ownKey = resolveTableRef((config as unknown as { tableKey?: string }).tableKey, tableKey) ?? tableKey;
  const inSome = (tables: string[], field: string) => tables.some((t) => hasField(u.tables[t], field));

  for (const [kpi, fields] of Object.entries(entries)) {
    const source = proc.kpis[kpi];
    if (!source) {
      finding(`importantFields[${kpi}]`, `nomes emitidos por '${String(config.templateKey)}'`);
      continue;
    }
    const tables = kpiTables(source, proc, params, ownKey);
    for (const field of fields) if (!inSome(tables, field)) finding(`importantFields[${kpi}]=${field}`, tables.join(' ∪ '));
  }
  const missingByField = new Map<string, string[]>();
  for (const [kpi, source] of Object.entries(proc.kpis)) {
    if (entries[kpi]) continue;
    const tables = kpiTables(source, proc, params, ownKey);
    for (const field of defaults) {
      if (!inSome(tables, field)) missingByField.set(field, [...(missingByField.get(field) ?? []), `${kpi} (${tables.join(' ∪ ')})`]);
    }
  }
  for (const [field, kpis] of missingByField) finding(`defaultImportantFields=${field}`, kpis.join('; '));
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
        collectImportantFieldsFindings(u, tableKey, config, push);
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
    // F-TAP-6 (b): chave fora dos nomes emitidos, e campo de `sales` num KPI cuja fonte é `expenses`.
    const sales = cloneTable(salon.tables.sales);
    const cashflow = sales.analytics!.find((c) => c.key === 'cashflowKpis')!;
    const cashImportant = (cashflow.options as { importantFields: Record<string, string[]> }).importantFields;
    cashImportant['Contas a Pagr Total'] = ['paymentStatus'];
    cashImportant['Prazo Médio de Pagamento (dias)'] = ['paymentStatus', 'totalAmount'];
    const typo: Universe = { name: 'typo', tables: { ...salon.tables, saleItems: items, expenses, sales } };
    const refs = collectAnalyticsFindings([typo]).map((f) => f.ref);
    expect(refs).toEqual(
      expect.arrayContaining([
        `${piped.key}:dateField=header.dat`,
        'costKpis:amountField=amout',
        'costKpis:defaultImportantFields=categoria',
        'cashflowKpis:importantFields[Contas a Pagr Total]',
        'cashflowKpis:importantFields[Prazo Médio de Pagamento (dias)]=totalAmount',
      ]),
    );
    // `mixed` = pelo menos uma das duas: `totalAmount` (só em `sales`) num KPI misto não é divergência.
    expect(refs).not.toContain('cashflowKpis:importantFields[Fluxo de Caixa Operacional]=totalAmount');
  });

  it('F-TAP-6 — o manifesto PROCESSOR_KPI_SOURCES bate com os nomes e as fontes do código dos processadores', () => {
    const kpisDir = path.resolve(__dirname, '../../../analytics/kpis');
    const sourceOf: Record<string, KpiSource> = { mainTableSource: 'main', expenseTableSource: 'expense', mixedTableSource: 'mixed' };
    const drift: string[] = [];
    for (const [templateKey, proc] of Object.entries(PROCESSOR_KPI_SOURCES)) {
      const src = fs.readFileSync(path.join(kpisDir, proc.file), 'utf8');
      const emitted = new Map<string, KpiSource | undefined>();
      for (const m of src.matchAll(/\{\s*name:\s*'([^']+)'[^{}]*?tableSource:\s*([A-Za-z]+)/g)) emitted.set(m[1], sourceOf[m[2]]);
      for (const [kpi, source] of Object.entries(proc.kpis)) {
        if (emitted.get(kpi) !== source) drift.push(`${templateKey}: '${kpi}' manifesto=${source} código=${emitted.get(kpi) ?? 'ausente'}`);
      }
      for (const kpi of emitted.keys()) if (!proc.kpis[kpi]) drift.push(`${templateKey}: '${kpi}' emitido e fora do manifesto`);
    }
    expect(drift).toEqual([]);
  });

  it('item 8 — KNOWN_GAPS de analytics só encolhe', () => {
    expect(partitionByKnownGaps(collectAnalyticsFindings(buildUniverses()), KNOWN_GAPS).stale).toEqual([]);
  });
});
