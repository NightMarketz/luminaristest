import type { UserContext } from '../../../types/UserContext';
import { ReportNotFoundError, ReportTooLargeError, ValidationError } from '../../../lib/errors';
import { moduleNotInstalled } from './CrmPipelineService';
import type { DynamicTableService } from '../../dynamicTables/services/DynamicTableService';
import type { IDynamicTableRepository } from '../../dynamicTables/repositories/IDynamicTableRepository';
import type { IDynamicTable, ISchemaField, ITableSchema } from '../../dynamicTables/models/DynamicTable.model';
import type { AnalyticsProcessorContext, ChartDataPoint, TableDataRow } from '../../analytics/core';
import type { Dimension, Filter, Measure, PipelineSpec } from '../../analytics/core/pipeline/Pipeline';
import { aggregatePipelineProcessor } from '../../analytics/dynamic/processors/AggregatePipelineProcessor';
import { addMoney } from '../../analytics/utils/CurrencyUtils';
import type { IPtaxRateRepository } from '../../fx/repositories/IPtaxRateRepository';
import { brasiliaNow, dbToDateOnly, PTAX_CURRENCIES, PTAX_RATE_SCALE, PTAX_SOURCE, type PtaxCurrency } from '../../fx/models/ptax';
import { CURRENCIES } from '../constants';
import type { ICrmReportDefinitionRepository } from '../repositories/ICrmReportDefinitionRepository';
import type { ICrmReportDefinitionPolicy } from '../policies/ICrmReportDefinitionPolicy';
import type { ICrmReportDefinition } from '../models/CrmReportDefinition.model';
import {
  CRM_MONEY_CURRENCY_PAIRS,
  NO_CURRENCY_KEY,
  type ConvertedView,
  type CreateCrmReportInput,
  type CrmReportSource,
  type CurrencyMode,
  type PtaxRateView,
  type ReportMeasure,
  type ReportSeries,
  type ReportSpec,
  type RunCrmReportInput,
  type RunCrmReportOutput,
  type RunSavedCrmReportInput,
  type UpdateCrmReportInput,
} from '../dtos/CrmReportDto';

/** Teto de linhas lidas por execução — fonte + joins + tabelas de nome de relação (F-RB5; número: dono, 13/10). */
export const CRM_REPORT_ROW_CAP = 20_000;
const STREAM_BATCH = 1000;
/** F-RB11=(b): sem `timeZone` no pedido, o balde de período sai em Brasília (diverge do 'UTC' do CrmAnalyticsService). */
export const CRM_REPORT_DEFAULT_TIME_ZONE = 'America/Sao_Paulo';
/** F-RB8b: PTAX com mais de 5 dias corridos da referência = `stale`. */
const PTAX_STALE_DAYS = 5;
const SYNTHETIC_DATE_FIELDS = ['_createdAt', '_updatedAt'];
/** Alias de join sem `alias` — o mesmo default do agregador (`j.alias || 'right'`). */
const DEFAULT_JOIN_ALIAS = 'right';

interface ResolvedJoin {
  alias: string;
  leftField: string;
  rightField: string;
  table: IDynamicTable;
  source: CrmReportSource;
}

interface ResolvedRef {
  /** Tabela dona do campo e seu internalName (fonte ou alvo de join). */
  table: IDynamicTable;
  source: CrmReportSource;
  /** Nome do campo dentro da tabela. */
  field: string;
  /** Prefixo do caminho na linha desnormalizada ('' na fonte, `${alias}.` no join). */
  prefix: string;
}

interface Plan {
  source: IDynamicTable;
  joins: ResolvedJoin[];
}

interface LoadedTable {
  table: IDynamicTable;
  schema: ITableSchema;
  rows: TableDataRow[];
}

/** Medida monetária (campo com `numberFormat: 'currency'`) com ou sem par de moeda declarado (itens 17 e 19). */
interface MoneyMeasure {
  index: number;
  measure: ReportMeasure & { type: 'sum' | 'avg'; field: string };
  name: string;
  /** Caminho do campo-par na linha desnormalizada; `null` = moeda não declarada (F-RB8d). */
  pairPath: string | null;
}

const schemaOf = (t: IDynamicTable): ITableSchema => t.schema as unknown as ITableSchema;
const fieldOf = (t: IDynamicTable, name: string): ISchemaField | undefined => schemaOf(t).fields.find((f) => f.name === name);
const seriesName = (m: ReportMeasure): string => m.alias ?? `${m.type}:${m.field ?? '*'}`;

function getPath(obj: Record<string, unknown>, path: string): unknown {
  if (!path.includes('.')) return obj[path];
  let cur: unknown = obj;
  for (const p of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts.slice(0, -1)) {
    if (cur[p] == null) cur[p] = {}; // linha da fonte sem par no join: o grupo de moeda vazia ainda sai nomeado (item 18)
    if (typeof cur[p] !== 'object') return;
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

const isEmptyCurrency = (v: unknown): boolean => v == null || v === '' || v === NO_CURRENCY_KEY;

/**
 * CrmReportService — BE-INCR-CRM-REPORT-BUILDER PR-2 (nó CRM-RB). Builder self-service de relatórios do CRM: CRUD das
 * definições (Prisma first-class, F-RB1=(a)) e execução sobre as tabelas CRM do DONO do relatório, reusando o
 * `aggregatePipelineProcessor` (nada de agregador novo — item 7). Somente leitura sobre dado operacional: nenhum evento,
 * ponte ou lançamento (alfândega: n/a).
 *
 * O que o serviço faz ANTES do agregador (o motor não muda — §9 E1–E6):
 * - resolve a fonte e cada join antes de agregar; tabela ausente → `moduleNotInstalled` (E3), nunca série vazia;
 * - lê toda tabela em lotes com um contador só e para no teto (E2) → 422 `REPORT_TOO_LARGE`;
 * - faz o join (pela `rightField` pedida) e monta o balde de período ele mesmo (E4: só-dia pelo dia escrito; `datetime`
 *   e `_createdAt`/`_updatedAt` no `timeZone` do run, F-RB11);
 * - chama o agregador uma vez por medida (F-RB10) e aplica `sort`/`limit` depois (F-RB9);
 * - moeda (F-RB8): soma sempre por moeda; a visão convertida pela PTAX venda vem à parte (item 24).
 */
export class CrmReportService {
  constructor(
    private readonly dynamicTableService: DynamicTableService,
    private readonly dynamicTableRepository: IDynamicTableRepository,
    private readonly repository: ICrmReportDefinitionRepository,
    private readonly policy: ICrmReportDefinitionPolicy,
    private readonly ptaxRateRepository: IPtaxRateRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  // ---------------------------------------------------------------------------------------------------------------
  // CRUD (itens 1–6)
  // ---------------------------------------------------------------------------------------------------------------

  /** Dono lista os seus; ADMIN lista todos (F-RB4=(c)). */
  async list(actor: UserContext): Promise<ICrmReportDefinition[]> {
    return this.policy.canListAll(actor) ? this.repository.findManyAll() : this.repository.findManyByUser(actor.userId);
  }

  /** Não existe, apagado ou alheio sem ser ADMIN → 404 `REPORT_NOT_FOUND` (anti-enumeração; item 12). */
  async get(actor: UserContext, id: string): Promise<ICrmReportDefinition> {
    const report = await this.repository.findById(id);
    if (!report || !this.policy.canView(actor, report.userId)) throw new ReportNotFoundError();
    return report;
  }

  async create(actor: UserContext, input: CreateCrmReportInput): Promise<ICrmReportDefinition> {
    await this.validate(actor.userId, input.spec);
    return this.repository.create({ userId: actor.userId, ...input });
  }

  /** O ADMIN edita relatório alheio sem transferir posse: `userId` nunca entra no patch (item 3). */
  async update(actor: UserContext, id: string, patch: UpdateCrmReportInput): Promise<ICrmReportDefinition> {
    const existing = await this.repository.findById(id);
    if (!existing || !this.policy.canUpdate(actor, existing.userId)) throw new ReportNotFoundError();
    if (patch.spec) await this.validate(existing.userId, patch.spec);
    return this.repository.update(id, patch);
  }

  async delete(actor: UserContext, id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing || !this.policy.canDelete(actor, existing.userId)) throw new ReportNotFoundError();
    await this.repository.softDelete(id);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Execução (itens 7–9, 12, 17–19, 24)
  // ---------------------------------------------------------------------------------------------------------------

  /** Relatório salvo (e widget `crmReport` do dashboard, item 12). O ADMIN lê as tabelas do DONO (item 3). */
  async runSaved(actor: UserContext, id: string, input: RunSavedCrmReportInput): Promise<RunCrmReportOutput> {
    const report = await this.get(actor, id);
    return this.execute(actor, report.userId, report.spec, input.timeZone);
  }

  /** Preview sem salvar (item 8) — sobre as tabelas do próprio usuário. */
  async runPreview(actor: UserContext, input: RunCrmReportInput): Promise<RunCrmReportOutput> {
    return this.execute(actor, actor.userId, input.spec, input.timeZone);
  }

  private async execute(actor: UserContext, ownerId: string, spec: ReportSpec, timeZone?: string): Promise<RunCrmReportOutput> {
    const tz = timeZone ?? CRM_REPORT_DEFAULT_TIME_ZONE;
    const { plan, money, currency } = await this.validate(ownerId, spec);

    // E2: um contador só para o run inteiro, checado durante a leitura em lotes.
    const budget = { read: 0 };
    const source = await this.load(actor, plan.source, budget);
    // Sequencial, não Promise.all: com o estouro num join, o outro não pode pedir mais um lote (E2).
    const joined: Array<{ join: ResolvedJoin; loaded: LoadedTable }> = [];
    for (const j of plan.joins) joined.push({ join: j, loaded: await this.load(actor, j.table, budget) });
    const relationTargets = await this.loadRelationTargets(actor, ownerId, plan.source, spec, budget);

    // Linhas desnormalizadas: dado + sintéticos + joins (cópia por linha: o serviço reescreve campos derivados).
    // `id` entra no dado: join/filtro/dimensão por 'id' leem o id da linha (o motor guarda o id fora de `data`).
    const rows: TableDataRow[] = source.rows.map((r) => ({ id: r.id, data: { id: r.id, ...r.data } }));
    for (const { join, loaded } of joined) {
      const index = new Map<string, Record<string, unknown>>();
      for (const rr of loaded.rows) {
        const key = join.rightField === 'id' ? rr.id : rr.data[join.rightField];
        if (key != null && key !== '' && !index.has(String(key))) index.set(String(key), rr.data);
      }
      for (const row of rows) {
        const left = row.data[join.leftField];
        const right = left == null || left === '' ? undefined : index.get(String(left));
        if (right) row.data[join.alias] = { ...right };
      }
    }

    // Dimensões: período vira campo derivado (E4/F-RB11); grupo de moeda vazia vira chave estável (item 18).
    const dimensions: Dimension[] = (spec.dimensions ?? []).map((d, i) => {
      if (d.type === 'field') {
        if (this.isCurrencyPairPath(plan, d.field)) {
          for (const row of rows) if (isEmptyCurrency(getPath(row.data, d.field))) setPath(row.data, d.field, NO_CURRENCY_KEY);
        }
        return { type: 'field', field: d.field, ...(d.label ? { label: d.label } : {}) };
      }
      const derived = `__period_${i}`;
      const ref = this.resolveRef(plan, d.dateField);
      const dateOnly = !SYNTHETIC_DATE_FIELDS.includes(ref.field) && fieldOf(ref.table, ref.field)?.type === 'date';
      for (const row of rows) row.data[derived] = periodBucket(getPath(row.data, d.dateField), d.period, dateOnly, tz);
      return { type: 'field', field: derived, ...(d.label ? { label: d.label } : {}) };
    });

    const aggregate = async (subset: TableDataRow[], dims: Dimension[], measure: Measure): Promise<ChartDataPoint[]> => {
      const pipeline: PipelineSpec = {
        source: { kind: 'tableId', id: source.table.id },
        filters: (spec.filters ?? []) as Filter[],
        dimensions: dims,
        measures: [measure],
      };
      const ctx: AnalyticsProcessorContext = {
        table: source.table,
        schema: source.schema,
        rows: subset,
        params: { pipeline },
        fetchByTableId: async (tableId: string) => {
          if (tableId === source.table.id) return { table: source.table, schema: source.schema, rows: subset };
          const t = relationTargets.byId.get(tableId);
          if (!t) throw new Error(`relation target '${tableId}' not loaded`);
          return t;
        },
        fetchByPresetTableKey: async (key: string) => {
          const t = relationTargets.byInternalName.get(key);
          if (!t) throw new Error(`relation target '${key}' not installed`);
          return t;
        },
      };
      return aggregatePipelineProcessor(ctx);
    };

    // F-RB10=(a): uma chamada por medida, sobre as mesmas linhas.
    const series: ReportSeries[] = [];
    for (const m of spec.measures) series.push({ measure: seriesName(m), points: await aggregate(rows, dimensions, m as Measure) });
    const ordered = applySortAndLimit(series, spec);

    const out: RunCrmReportOutput = {
      series: ordered,
      meta: { rowsRead: budget.read, truncated: false, currency, timeZone: tz },
    };
    if (spec.convertTo) out.converted = await this.convert(spec, rows, dimensions, money, aggregate);
    return out;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Validação contra o schema vivo (itens 5, 6, 17, 19, 24; F-RB9)
  // ---------------------------------------------------------------------------------------------------------------

  private async validate(ownerId: string, spec: ReportSpec): Promise<{ plan: Plan; money: MoneyMeasure[]; currency: CurrencyMode }> {
    const source = await this.resolveTable(ownerId, spec.source);
    const joins: ResolvedJoin[] = [];
    for (const j of spec.joins ?? []) {
      const alias = j.alias ?? DEFAULT_JOIN_ALIAS;
      // O alias vira chave na linha desnormalizada: não pode repetir nem esconder um campo da fonte.
      if (joins.some((x) => x.alias === alias) || alias === 'id' || alias.startsWith('_') || fieldOf(source, alias)) {
        throw new ValidationError('Alias de join repetido ou em conflito com um campo da fonte.', { alias }, 'REPORT_JOIN_ALIAS_DUPLICATE');
      }
      // E3: a tabela do join é resolvida ANTES do agregador — ausente vira erro nomeado, nunca vazio.
      const table = await this.resolveTable(ownerId, j.rightSource);
      joins.push({ alias, leftField: j.leftField, rightField: j.rightField, table, source: j.rightSource });
    }
    const plan: Plan = { source, joins };

    for (const j of joins) {
      this.assertField(source, j.leftField);
      this.assertField(j.table, j.rightField);
    }
    for (const f of spec.filters ?? []) this.resolveRef(plan, f.field);
    for (const d of spec.dimensions ?? []) this.resolveRef(plan, d.type === 'field' ? d.field : d.dateField);
    for (const m of spec.measures) if (m.field) this.resolveRef(plan, m.field);

    // F-RB9: sort.key tem de casar com uma medida.
    if (spec.sort?.by === 'measure' && spec.sort.key && !spec.measures.some((m) => seriesName(m) === spec.sort!.key)) {
      throw new ValidationError('sort.key não corresponde a nenhuma medida.', { key: spec.sort.key }, 'REPORT_SORT_KEY_NOT_FOUND');
    }

    // Itens 17 e 19: medida sum/avg sobre campo monetário.
    const money: MoneyMeasure[] = [];
    spec.measures.forEach((m, index) => {
      if ((m.type !== 'sum' && m.type !== 'avg') || !m.field) return;
      const ref = this.resolveRef(plan, m.field);
      if (fieldOf(ref.table, ref.field)?.numberFormat !== 'currency') return;
      const pairField = this.pairFieldOf(ref);
      const pairPath = pairField ? `${ref.prefix}${pairField}` : null;
      if (pairPath) {
        const byDimension = (spec.dimensions ?? []).some((d) => d.type === 'field' && d.field === pairPath);
        if (!byDimension && singleCurrencyFilter(spec, pairPath) === undefined) {
          throw new ValidationError(
            'Soma/média de valor monetário sem separar por moeda.',
            { field: m.field, currencyField: pairPath },
            'REPORT_CURRENCY_MIXED',
          );
        }
      }
      money.push({ index, measure: m as MoneyMeasure['measure'], name: seriesName(m), pairPath });
    });

    if (spec.convertTo && !money.some((mm) => mm.pairPath)) {
      throw new ValidationError('convertTo sem medida monetária com moeda declarada.', null, 'REPORT_CONVERSION_NOT_APPLICABLE');
    }
    return { plan, money, currency: currencyMode(spec, money) };
  }

  private async resolveTable(ownerId: string, internalName: CrmReportSource): Promise<IDynamicTable> {
    const table = await this.dynamicTableRepository.findTableByInternalName(ownerId, internalName);
    if (!table) throw moduleNotInstalled(internalName);
    return table;
  }

  /** `campo` → fonte; `alias.campo` → tabela do join. Inexistente → 400 `REPORT_FIELD_NOT_FOUND` (item 6). */
  private resolveRef(plan: Plan, ref: string): ResolvedRef {
    const dot = ref.indexOf('.');
    if (dot === -1) {
      this.assertField(plan.source, ref);
      return { table: plan.source, source: plan.source.internalName as CrmReportSource, field: ref, prefix: '' };
    }
    const alias = ref.slice(0, dot);
    const field = ref.slice(dot + 1);
    const join = plan.joins.find((j) => j.alias === alias);
    if (!join || field.includes('.')) throw fieldNotFound(ref);
    this.assertField(join.table, field, ref);
    return { table: join.table, source: join.source, field, prefix: `${alias}.` };
  }

  private assertField(table: IDynamicTable, field: string, reported: string = field): void {
    if (field === 'id' || SYNTHETIC_DATE_FIELDS.includes(field) || fieldOf(table, field)) return;
    throw fieldNotFound(reported);
  }

  /** Campo-par de moeda declarado E presente no schema vivo; senão `null` (F-RB8d). */
  private pairFieldOf(ref: ResolvedRef): string | null {
    const pairs = (CRM_MONEY_CURRENCY_PAIRS as Partial<Record<CrmReportSource, Record<string, string>>>)[ref.source];
    const pair = pairs?.[ref.field];
    return pair && fieldOf(ref.table, pair) ? pair : null;
  }

  private isCurrencyPairPath(plan: Plan, path: string): boolean {
    const ref = this.resolveRef(plan, path);
    const pairs = (CRM_MONEY_CURRENCY_PAIRS as Partial<Record<CrmReportSource, Record<string, string>>>)[ref.source];
    return !!pairs && Object.values(pairs).includes(ref.field);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Leitura em lotes com teto (E2)
  // ---------------------------------------------------------------------------------------------------------------

  private async load(actor: UserContext, table: IDynamicTable, budget: { read: number }): Promise<LoadedTable> {
    const rows: TableDataRow[] = [];
    // Cada lote pede no máximo o que falta para passar do teto em 1 — nunca o lote seguinte ao estouro.
    const stream = this.dynamicTableService.getTableDataStream(actor, table.id, Math.min(STREAM_BATCH, CRM_REPORT_ROW_CAP - budget.read + 1));
    for await (const batch of stream) {
      budget.read += batch.length;
      if (budget.read > CRM_REPORT_ROW_CAP) throw new ReportTooLargeError(budget.read, CRM_REPORT_ROW_CAP);
      for (const d of batch) {
        rows.push({ id: d.id, data: { ...((d.data as Record<string, unknown>) || {}), _createdAt: d.createdAt, _updatedAt: d.updatedAt } });
      }
    }
    return { table, schema: schemaOf(table), rows };
  }

  /** Alvos de relação das dimensões `field` da fonte (o agregador troca o id pelo nome) — também contam no teto. */
  private async loadRelationTargets(
    actor: UserContext,
    ownerId: string,
    source: IDynamicTable,
    spec: ReportSpec,
    budget: { read: number },
  ): Promise<{ byInternalName: Map<string, LoadedTable>; byId: Map<string, LoadedTable> }> {
    const byInternalName = new Map<string, LoadedTable>();
    const byId = new Map<string, LoadedTable>();
    for (const d of spec.dimensions ?? []) {
      if (d.type !== 'field') continue;
      const target = fieldOf(source, d.field);
      const ref = target?.type === 'relation' ? target.relation?.targetTable : undefined;
      if (!ref) continue;
      if (ref.startsWith('@@PRESET_TABLE_KEY::')) {
        const key = ref.replace('@@PRESET_TABLE_KEY::', '');
        if (byInternalName.has(key)) continue;
        const t = await this.dynamicTableRepository.findTableByInternalName(ownerId, key);
        if (t) byInternalName.set(key, await this.load(actor, t, budget)); // ausente: o agregador mostra o id cru
      } else if (!ref.startsWith('@@') && !byId.has(ref)) {
        const t = await this.dynamicTableRepository.findTableById(ref);
        if (t && t.userId === ownerId) byId.set(ref, await this.load(actor, t, budget));
      }
    }
    return { byInternalName, byId };
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Visão convertida à parte (item 24; F-RB8a/b/e)
  // ---------------------------------------------------------------------------------------------------------------

  private async convert(
    spec: ReportSpec,
    rows: TableDataRow[],
    dimensions: Dimension[],
    money: MoneyMeasure[],
    aggregate: (subset: TableDataRow[], dims: Dimension[], measure: Measure) => Promise<ChartDataPoint[]>,
  ): Promise<ConvertedView> {
    const referenceDate = brasiliaNow(this.now()).date; // F-RB8a: câmbio SIMULADO, o dia da consulta
    const excluded: ConvertedView['excluded'] = [];
    const rateCache = new Map<string, PtaxRateView | null>();
    const rateOf = async (currency: string): Promise<PtaxRateView | null> => {
      if (!rateCache.has(currency)) {
        let view: PtaxRateView | null = null;
        if ((PTAX_CURRENCIES as readonly string[]).includes(currency)) {
          const row = await this.ptaxRateRepository.findLatestOnOrBefore(currency as PtaxCurrency, referenceDate);
          if (row) {
            const rateDate = dbToDateOnly(row.rateDate);
            view = {
              currency: currency as PtaxCurrency,
              side: 'venda',
              rate: row.sellRateE5 / PTAX_RATE_SCALE,
              rateDate,
              stale: daysBetween(rateDate, referenceDate) > PTAX_STALE_DAYS,
              source: PTAX_SOURCE,
            };
          }
        }
        rateCache.set(currency, view);
      }
      return rateCache.get(currency) ?? null;
    };
    const countRows = async (subset: TableDataRow[]): Promise<number> => (await aggregate(subset, [], { type: 'count' }))[0]?.value ?? 0;

    const series: ReportSeries[] = [];
    for (const mm of money) {
      if (!mm.pairPath) {
        const n = await countRows(rows);
        if (n > 0) excluded.push({ reason: 'UNDECLARED_CURRENCY', measure: mm.name, rows: n });
        continue;
      }
      // Dimensão de moeda colapsa: agrega cada moeda à parte, sem ela, e soma convertido por nome de ponto.
      const dims = dimensions.filter((d) => !(d.type === 'field' && d.field === mm.pairPath));
      const partitions = new Map<string, TableDataRow[]>();
      for (const row of rows) {
        const v = getPath(row.data, mm.pairPath);
        const key = isEmptyCurrency(v) ? NO_CURRENCY_KEY : String(v);
        if (!partitions.has(key)) partitions.set(key, []);
        partitions.get(key)!.push(row);
      }
      const sums = new Map<string, number>();
      const counts = new Map<string, number>();
      for (const [currency, subset] of partitions) {
        if (currency === NO_CURRENCY_KEY) {
          // Só as linhas que TÊM valor sem moeda (lead sem proposta não é "excluído", não tem o que converter).
          const n = await countRows(subset.filter((r) => { const v = getPath(r.data, mm.measure.field); return v != null && v !== ''; }));
          if (n > 0) excluded.push({ reason: 'NO_CURRENCY', measure: mm.name, rows: n });
          continue;
        }
        const rate = currency === 'BRL' ? 1 : (await rateOf(currency))?.rate;
        if (rate === undefined) {
          const n = await countRows(subset);
          if (n > 0) excluded.push({ reason: 'RATE_UNAVAILABLE', measure: mm.name, currency, rows: n });
          continue;
        }
        // avg convertida = Σ(soma_c × taxa_c) ÷ Σ n_c — sum e count internas, cada uma numa chamada própria (F-RB10).
        for (const p of await aggregate(subset, dims, { type: 'sum', field: mm.measure.field })) {
          sums.set(p.name, addMoney(sums.get(p.name) ?? 0, p.value * rate));
        }
        if (mm.measure.type === 'avg') {
          for (const p of await aggregate(subset, dims, { type: 'count' })) counts.set(p.name, (counts.get(p.name) ?? 0) + p.value);
        }
      }
      const points: ChartDataPoint[] = [...sums.entries()].map(([name, total]) => ({
        name,
        value: mm.measure.type === 'avg' ? Math.round((total / (counts.get(name) || 1)) * 100) / 100 : total,
      }));
      series.push({ measure: mm.name, points });
    }

    const rates = [...rateCache.values()].filter((v): v is PtaxRateView => v !== null);
    return { target: 'BRL', referenceDate, rates, series: applySortAndLimitByName(series, spec), excluded };
  }
}

// -----------------------------------------------------------------------------------------------------------------
// Funções puras
// -----------------------------------------------------------------------------------------------------------------

function fieldNotFound(field: string): ValidationError {
  return new ValidationError(`Campo '${field}' não existe no schema da tabela.`, { field }, 'REPORT_FIELD_NOT_FOUND');
}

/** Filtro `eq`, ou `in` com um único valor, no campo-par → a moeda fixa; senão `undefined` (item 17). */
function singleCurrencyFilter(spec: ReportSpec, pairPath: string): unknown {
  for (const f of spec.filters ?? []) {
    if (f.field !== pairPath) continue;
    if (f.op === 'eq') return f.value;
    if (f.op === 'in' && Array.isArray(f.value) && f.value.length === 1) return f.value[0];
  }
  return undefined;
}

/** `meta.currency` pela PRIMEIRA medida monetária do spec (o contrato tem um modo só por relatório). */
function currencyMode(spec: ReportSpec, money: MoneyMeasure[]): CurrencyMode {
  const first = money[0];
  if (!first) return null;
  if (!first.pairPath) return { mode: 'undeclared' };
  if ((spec.dimensions ?? []).some((d) => d.type === 'field' && d.field === first.pairPath)) return { mode: 'dimension', field: first.pairPath };
  const value = String(singleCurrencyFilter(spec, first.pairPath));
  return { mode: 'filter', field: first.pairPath, value: value as (typeof CURRENCIES)[number] };
}

/**
 * F-RB9=(a): ordena pela dimensão (nome) ou pela medida `sort.key` (ou a única medida), desempate pelo nome; aplica o
 * `limit` depois. Todas as séries ficam com o mesmo conjunto e a mesma ordem de pontos. Sem `sort`: por nome, asc
 * (a ordem que o agregador já devolve). Na visão convertida, `key` que não é série convertida cai na ordem por nome.
 */
function applySortAndLimit(series: ReportSeries[], spec: ReportSpec): ReportSeries[] {
  if (series.length === 0) return series;
  const dir = spec.sort?.dir === 'desc' ? -1 : 1;
  const key = spec.sort?.by === 'measure' ? (spec.sort.key ?? (series.length === 1 ? series[0].measure : undefined)) : undefined;
  const keySeries = key ? series.find((s) => s.measure === key) : undefined;
  // As séries do agregador saem com os mesmos grupos na mesma posição (mesmas linhas, filtros e dimensões; ordem por
  // nome, estável). Alinhar por POSIÇÃO, não por nome: dois grupos com o mesmo nome de exibição (etapas homônimas em
  // funis diferentes, contatos homônimos) são pontos distintos e nenhum pode sumir.
  const base = keySeries ?? series[0];
  const idx = base.points.map((_, i) => i);
  const nameAt = (i: number): string => base.points[i].name;
  if (keySeries) idx.sort((a, b) => dir * (keySeries.points[a].value - keySeries.points[b].value) || nameAt(a).localeCompare(nameAt(b)) || a - b);
  else idx.sort((a, b) => dir * nameAt(a).localeCompare(nameAt(b)) || a - b);
  const order = spec.limit ? idx.slice(0, spec.limit) : idx;
  return series.map((s) => {
    if (s.points.length !== base.points.length) throw new Error('séries desalinhadas: o agregador devolveu grupos diferentes por medida');
    return { measure: s.measure, points: order.map((i) => s.points[i]) };
  });
}

/**
 * Variante da visão convertida: lá cada ponto já é a soma, por NOME, das moedas convertidas (a dimensão de moeda
 * colapsa), então o nome é a chave e os conjuntos podem diferir entre medidas (exclusões diferentes). Mesmas regras
 * de `sort`/`limit`; `key` que não é série convertida cai na ordem por nome.
 */
function applySortAndLimitByName(series: ReportSeries[], spec: ReportSpec): ReportSeries[] {
  if (series.length === 0) return series;
  const dir = spec.sort?.dir === 'desc' ? -1 : 1;
  const names = [...new Set(series.flatMap((s) => s.points.map((p) => p.name)))];
  const key = spec.sort?.by === 'measure' ? (spec.sort.key ?? (series.length === 1 ? series[0].measure : undefined)) : undefined;
  const keySeries = key ? series.find((s) => s.measure === key) : undefined;
  if (keySeries) {
    const value = new Map(keySeries.points.map((p) => [p.name, p.value]));
    names.sort((a, b) => dir * ((value.get(a) ?? 0) - (value.get(b) ?? 0)) || a.localeCompare(b));
  } else {
    names.sort((a, b) => dir * a.localeCompare(b));
  }
  const order = spec.limit ? names.slice(0, spec.limit) : names;
  return series.map((s) => {
    const point = new Map(s.points.map((p) => [p.name, p]));
    return { measure: s.measure, points: order.map((n) => point.get(n)).filter((p): p is ChartDataPoint => !!p) };
  });
}

/**
 * Balde de período montado pelo serviço (§9 E4; o `formatPeriod` do agregador usa o fuso do processo):
 * - campo `date` (só-dia): o DIA ESCRITO (`slice(0, 10)`), nunca `new Date` + getter local;
 * - `datetime` e `_createdAt`/`_updatedAt`: o dia civil no `timeZone` do run (F-RB11).
 * Mesmos formatos do agregador (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `YYYY-Qn`, `YYYY-Wn`); valor inválido → 'Unknown'.
 */
export function periodBucket(value: unknown, period: 'day' | 'week' | 'month' | 'quarter' | 'year', dateOnly: boolean, timeZone: string): string {
  let ymd: string | null = null;
  if (dateOnly) {
    const s = value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : '';
    ymd = /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
  } else if (value != null && value !== '') {
    const d = value instanceof Date ? value : new Date(String(value));
    if (!Number.isNaN(d.getTime())) {
      ymd = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    }
  }
  if (!ymd) return 'Unknown';
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  const day = Number(ymd.slice(8, 10));
  switch (period) {
    case 'year':
      return `${y}`;
    case 'day':
      return ymd;
    case 'quarter':
      return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
    case 'week': {
      // Mesma fórmula do agregador, sobre o dia civil (sem fuso do processo).
      const firstJan = Date.UTC(y, 0, 1);
      const days = Math.floor((Date.UTC(y, m - 1, day) - firstJan) / 86400000);
      const week = Math.ceil((days + new Date(firstJan).getUTCDay() + 1) / 7);
      return `${y}-W${week}`;
    }
    case 'month':
    default:
      return ymd.slice(0, 7);
  }
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}
