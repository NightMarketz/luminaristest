import type {
  CreateCrmReportInput,
  CrmReportRow,
  CrmReportRunOutput,
  UpdateCrmReportInput,
} from '../../../lib/services/crmReports.service';
import type { ISchemaField } from '../../dashboard/components/shared/dynamic-tables.client';
import { nonEmpty } from '../../../lib/utils/nonEmpty';

/**
 * Lógica pura da tela do builder de relatórios do CRM (FE-INCR-CRM-REPORT-BUILDER PR-A, BRIEF
 * `docs/crm/FE-INCR-CRM-REPORT-BUILDER-brief.md` §1 itens 3–9, 11–18; PR-B, item 10 — joins). Sem React: o editor monta um rascunho
 * (`ReportDraft`), estas funções dizem o que oferecer, o que bloqueia a visualização e como o rascunho vira o spec do
 * contrato gerado. O BE continua sendo a verdade de toda regra (o FE só evita o 400).
 */

export type ReportSpec = CreateCrmReportInput['spec'];
export type ReportSource = ReportSpec['source'];
export type ReportKind = CreateCrmReportInput['kind'];
export type ReportChartType = CreateCrmReportInput['chartType'];
type SpecMeasure = ReportSpec['measures'][number];
type SpecDimension = NonNullable<ReportSpec['dimensions']>[number];
type SpecFilter = NonNullable<ReportSpec['filters']>[number];
type SpecSort = NonNullable<ReportSpec['sort']>;
type SpecJoin = NonNullable<ReportSpec['joins']>[number];
export type FilterOp = SpecFilter['op'];
export type PeriodUnit = Extract<SpecDimension, { type: 'period' }>['period'];
export type MeasureType = SpecMeasure['type'];

/** Whitelist de fontes do BE (`CRM_REPORT_SOURCES`, F-RB3). A guarda abaixo quebra o tsc se o contrato ganhar fonte. */
export const REPORT_SOURCES = [
  'leads',
  'crmOpportunities',
  'leadActivities',
  'leadProposals',
  'crmAccounts',
  'crmContacts',
] as const satisfies readonly ReportSource[];
type MissingSource = Exclude<ReportSource, (typeof REPORT_SOURCES)[number]>;
const SOURCES_COVER_CONTRACT: [MissingSource] extends [never] ? true : never = true;
void SOURCES_COVER_CONTRACT;

/**
 * Espelho DECLARADO do par valor→moeda do BE (`CRM_MONEY_CURRENCY_PAIRS`, item 8) — só UX; a verdade é o 400
 * `REPORT_CURRENCY_MIXED`. ponytail: duplicação de constante (não de DTO); o FE não importa o backend (BRIEF §3, §6).
 */
export const CRM_MONEY_CURRENCY_PAIRS_FE: Partial<Record<ReportSource, Readonly<Record<string, string>>>> = {
  leads: { latestProposalAmount: 'latestProposalCurrency' },
  leadProposals: { amount: 'currency' },
  crmOpportunities: { amount: 'currency' },
};

export const NO_CURRENCY_KEY = '__NO_CURRENCY__';
export const MAX_MEASURES = 4;
export const MAX_DIMENSIONS = 2;
export const MAX_FILTERS = 10;
export const MAX_LIMIT = 500;
/** F-RB5 (`ReportSpecSchema.joins.max(2)`) e `ReportJoinSchema.alias.max(40)`. */
export const MAX_JOINS = 2;
export const MAX_JOIN_ALIAS = 40;
export const FILTER_OPS: readonly FilterOp[] = ['eq', 'ne', 'in', 'nin', 'gt', 'gte', 'lt', 'lte'];
export const PERIODS: readonly PeriodUnit[] = ['day', 'week', 'month', 'quarter', 'year'];
export const KINDS: readonly ReportKind[] = ['chart', 'table', 'kpi'];
const CHART_TYPES_GRAPHIC: readonly ReportChartType[] = ['bar', 'line', 'area', 'pie', 'donut'];
const CURRENCY_CODES = ['BRL', 'USD', 'EUR'] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

// ---------------------------------------------------------------------------------------------------------------
// Rascunho do editor
// ---------------------------------------------------------------------------------------------------------------

export interface MeasureDraft {
  type: MeasureType;
  /** '' em `count` = contar linhas. */
  field: string;
  alias: string;
}
/** `label` só passa adiante (relatório salvo pela API); o editor não o edita. */
export type DimensionDraft =
  | { type: 'field'; field: string; label?: string }
  | { type: 'period'; dateField: string; period: PeriodUnit; label?: string };
export interface FilterDraft {
  field: string;
  op: FilterOp;
  /** Valor já tipado pelo editor (número, booleano, texto); em `in`/`nin`, array. */
  value: unknown;
}
export interface SortDraft {
  by: 'dimension' | 'measure';
  /** Índice da medida quando `by:'measure'` — vira o `sort.key` (alias ou `tipo:campo`) no envio. */
  measureIndex: number | null;
  dir: 'asc' | 'desc';
}
/** Item 10: cruzamento com outra tabela da whitelist (`ReportJoinSchema`). `''`/`null` = ainda não escolhido. */
export interface JoinDraft {
  rightSource: ReportSource | null;
  /** Campo da fonte (o BE só aceita campo da fonte — `assertField(source, leftField)`). */
  leftField: string;
  rightField: string;
  /** Obrigatório na tela, pré-preenchido com o nome da tabela ([[D-2026-10-13-FE-CRM-RB-PR-B-D-LACUNAS]]). */
  alias: string;
  /**
   * Texto digitado no apelido e ainda não aplicado (aplica ao sair do campo, se válido). Não vai ao spec; inválido
   * bloqueia visualizar/salvar (review do PR-B, achado 3).
   */
  pendingAlias?: string;
}

export interface ReportDraft {
  name: string;
  description: string;
  kind: ReportKind;
  chartType: ReportChartType;
  source: ReportSource | null;
  measures: MeasureDraft[];
  dimensions: DimensionDraft[];
  filters: FilterDraft[];
  sort: SortDraft | null;
  limit: number | null;
  convertTo: boolean;
  /** Item 10 (PR-B): até 2 cruzamentos; os campos deles entram nos itens 5–7 como `apelido.campo`. */
  joins: JoinDraft[];
}

export function emptyDraft(): ReportDraft {
  return {
    name: '',
    description: '',
    kind: 'chart',
    chartType: 'bar',
    source: null,
    measures: [{ type: 'count', field: '', alias: '' }],
    dimensions: [],
    filters: [],
    sort: null,
    limit: null,
    convertTo: false,
    joins: [],
  };
}

/** Chave da série no BE (`seriesName`): alias, ou `tipo:campo` (`*` no count sem campo). */
export function measureKey(m: MeasureDraft): string {
  const alias = m.alias.trim();
  return alias || `${m.type}:${m.field || '*'}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Campos (itens 3–7)
// ---------------------------------------------------------------------------------------------------------------

export interface SyntheticLabels {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Item 4: campos do schema vivo + `id`, `_createdAt`, `_updatedAt` (sintéticos do agregador). Campo oculto continua na
 * lista (o par de moeda pode estar oculto e o BE o enxerga — `pairFieldOf`), mas não é oferecido (`offeredFields`).
 */
export function reportFields(schemaFields: readonly ISchemaField[], labels: SyntheticLabels): ISchemaField[] {
  // json não é oferecido (oculto), mas fica na lista: o apelido de join não pode repetir nome de campo nenhum da fonte
  // (`fieldOf(source, alias)` no BE) — review do PR-B, achado 4
  const own = schemaFields.map((f): ISchemaField => (f.type === 'json' ? { ...f, hidden: true } : f));
  return [
    ...own,
    { name: 'id', label: labels.id, type: 'string' },
    { name: '_createdAt', label: labels.createdAt, type: 'datetime' },
    { name: '_updatedAt', label: labels.updatedAt, type: 'datetime' },
  ];
}

export const fieldLabel = (f: ISchemaField): string => f.label || f.name;
/** O que o editor oferece nos selects: sem os ocultos. */
export const offeredFields = (fields: readonly ISchemaField[]): ISchemaField[] => fields.filter((f) => !f.hidden);
export const isMoneyField = (f: ISchemaField | undefined): boolean => f?.type === 'number' && f.numberFormat === 'currency';
const isDateField = (f: ISchemaField): boolean => f.type === 'date' || f.type === 'datetime';

/** Item 5: `count` aceita qualquer campo (opcional); `sum`/`avg` só `number`. */
export function measureFieldOptions(type: MeasureType, fields: readonly ISchemaField[]): ISchemaField[] {
  const offered = offeredFields(fields);
  return type === 'count' ? offered : offered.filter((f) => f.type === 'number');
}

/** Item 6: período só em campo de data (inclui os sintéticos). */
export function periodFieldOptions(fields: readonly ISchemaField[]): ISchemaField[] {
  return offeredFields(fields).filter(isDateField);
}

// ---------------------------------------------------------------------------------------------------------------
// Joins (item 10, F-FRB5=(a))
// ---------------------------------------------------------------------------------------------------------------

/** Campos da tabela da direita (já com os sintéticos de `reportFields`) por fonte; `null`/`undefined` = não carregado. */
export type RightFieldsOf = (source: ReportSource) => readonly ISchemaField[] | null | undefined;
const noRightFields: RightFieldsOf = () => null;

/** `apelido.campo` é campo de join; campo da fonte nunca tem ponto. */
export const isJoinRef = (name: string): boolean => name.includes('.');
const sourceOnly = (fields: readonly ISchemaField[]): ISchemaField[] => fields.filter((f) => !isJoinRef(f.name));

/**
 * Item 10: campos de cada join como `apelido.campo` (rótulo `apelido.Rótulo`). Sem `apelido.id`: a linha do join não
 * carrega o id no BE (`index.set(key, rr.data)`) — o valor sairia vazio ([[D-2026-10-13-FE-CRM-RB-PR-B-D-LACUNAS]]).
 */
export function joinedFields(joins: readonly JoinDraft[], rightFieldsOf: RightFieldsOf): ISchemaField[] {
  return joins.flatMap((j) => {
    const right = j.rightSource && j.alias ? rightFieldsOf(j.rightSource) : null;
    if (!right) return [];
    return right
      .filter((f) => f.name !== 'id')
      .map((f): ISchemaField => ({ ...f, name: `${j.alias}.${f.name}`, label: `${j.alias}.${fieldLabel(f)}` }));
  });
}

/** Lista única dos itens 5–7: campos da fonte (com sintéticos) + campos dos joins. */
export function combinedFields(sourceFields: readonly ISchemaField[], joins: readonly JoinDraft[], rightFieldsOf: RightFieldsOf): ISchemaField[] {
  return [...sourceOnly(sourceFields), ...joinedFields(joins, rightFieldsOf)];
}

/**
 * "Agrupar por campo": sem campo de relação do join — o BE só resolve o nome da relação para campo da fonte
 * (`loadRelationTargets`) e mostraria o id cru ([[D-2026-10-13-FE-CRM-RB-PR-B-D-LACUNAS]]).
 */
export function dimensionFieldOptions(fields: readonly ISchemaField[]): ISchemaField[] {
  return offeredFields(fields).filter((f) => !(isJoinRef(f.name) && f.type === 'relation'));
}

/** Campo da esquerda do vínculo: só campos da fonte (o BE não aceita `apelido.campo` aqui). */
export const joinLeftFieldOptions = (fields: readonly ISchemaField[]): ISchemaField[] => offeredFields(sourceOnly(fields));

export type AliasProblem = 'REQUIRED' | 'CHARS' | 'TOO_LONG' | 'RESERVED' | 'DUPLICATE' | 'FIELD_CONFLICT';

/**
 * Regras do BE (`REPORT_JOIN_ALIAS_DUPLICATE`: repetido, `id`, começa com `_`, igual a campo da fonte) + o que quebra a
 * referência `apelido.campo` (ponto, espaço) + o teto do DTO (40).
 */
export function aliasProblem(alias: string, index: number, joins: readonly JoinDraft[], sourceFields: readonly ISchemaField[]): AliasProblem | null {
  if (alias === '') return 'REQUIRED';
  if (/[.\s]/.test(alias)) return 'CHARS';
  if (alias.length > MAX_JOIN_ALIAS) return 'TOO_LONG';
  if (alias === 'id' || alias.startsWith('_')) return 'RESERVED';
  if (joins.some((j, i) => i !== index && j.alias === alias)) return 'DUPLICATE';
  if (sourceOnly(sourceFields).some((f) => f.name === alias)) return 'FIELD_CONFLICT';
  return null;
}

/** Apelido sugerido: o nome da tabela da direita; `_2`, `_3`… se já estiver em uso. */
export function suggestAlias(source: ReportSource, index: number, joins: readonly JoinDraft[], sourceFields: readonly ISchemaField[]): string {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? source : `${source}_${n}`;
    if (aliasProblem(candidate, index, joins, sourceFields) === null) return candidate;
  }
}

const rewriteRef = (name: string, from: string, to: string): string => (name.startsWith(`${from}.`) ? `${to}${name.slice(from.length)}` : name);

/** Renomear o apelido reescreve as referências `apelido.campo` (decisão do dono, PR-B/D lacunas). */
export function renameJoinAlias(draft: ReportDraft, index: number, alias: string): ReportDraft {
  const old = draft.joins[index]?.alias ?? '';
  const joins = draft.joins.map(
    (j, i): JoinDraft => (i === index ? { rightSource: j.rightSource, leftField: j.leftField, rightField: j.rightField, alias } : j),
  );
  if (!old || old === alias) return { ...draft, joins };
  const r = (name: string) => rewriteRef(name, old, alias);
  return {
    ...draft,
    joins,
    measures: draft.measures.map((m): MeasureDraft => ({ ...m, field: r(m.field) })),
    dimensions: draft.dimensions.map((d): DimensionDraft => (d.type === 'field' ? { ...d, field: r(d.field) } : { ...d, dateField: r(d.dateField) })),
    filters: draft.filters.map((f): FilterDraft => ({ ...f, field: r(f.field) })),
  };
}

/** O apelido é o que a tela sugeriu para essa tabela (`leads`, `leads_2`…)? */
const isSuggestedAlias = (alias: string, source: ReportSource): boolean => alias === source || new RegExp(`^${source}_\\d+$`).test(alias);

/**
 * Escolher a tabela da direita. Num join novo, o apelido vazio ganha a sugestão. TROCAR a tabela de um join existente
 * tira todo item que cita `apelido.campo` dele — mesmo nome de campo na tabela nova é outro dado (review do PR-B,
 * achado 2) —, zera o campo da direita e troca o apelido sugerido pelo da tabela nova; apelido escrito pelo usuário fica.
 * A perda é confirmada antes (`itemsLost`).
 */
export function withJoinSource(
  draft: ReportDraft,
  index: number,
  source: ReportSource,
  sourceFields: readonly ISchemaField[],
  rightFieldsOf: RightFieldsOf,
): ReportDraft {
  const old = draft.joins[index];
  if (!old || old.rightSource === source) return draft;
  const changed = old.rightSource !== null;
  const base = changed && old.alias ? pruneBy(draft, (name) => !name.startsWith(`${old.alias}.`)) : draft;
  const resuggest = !old.alias || (old.rightSource !== null && isSuggestedAlias(old.alias, old.rightSource));
  const joins = base.joins.map((j, i): JoinDraft => {
    if (i !== index) return j;
    const others = base.joins.map((x, k): JoinDraft => (k === index ? { ...x, alias: '' } : x));
    const alias = resuggest ? suggestAlias(source, index, others, sourceFields) : j.alias;
    return { rightSource: source, leftField: j.leftField, rightField: changed ? '' : j.rightField, alias };
  });
  return pruneItems({ ...base, joins }, combinedFields(sourceFields, joins, rightFieldsOf));
}

/** Remover o join tira os itens que citam `apelido.campo` dele. */
export function removeJoin(draft: ReportDraft, index: number, sourceFields: readonly ISchemaField[], rightFieldsOf: RightFieldsOf): ReportDraft {
  const joins = draft.joins.filter((_, i) => i !== index);
  return pruneItems({ ...draft, joins }, combinedFields(sourceFields, joins, rightFieldsOf));
}

export function addJoin(draft: ReportDraft): ReportDraft {
  if (draft.joins.length >= MAX_JOINS) return draft;
  return { ...draft, joins: [...draft.joins, { rightSource: null, leftField: '', rightField: '', alias: '' }] };
}

/** Item 7: valor do filtro tipado pelo campo (número → Number; booleano → true/false; resto, texto). */
export function coerceFilterValue(raw: string, field: ISchemaField | undefined): unknown {
  if (field?.type === 'number') {
    const n = Number(raw);
    return raw.trim() === '' || Number.isNaN(n) ? '' : n;
  }
  if (field?.type === 'boolean') return raw === 'true';
  return raw;
}

export const isMultiValueOp = (op: FilterOp): boolean => op === 'in' || op === 'nin';

/** `options` do schema (string ou {label,value}) normalizadas para o select do filtro. */
export function selectOptions(field: ISchemaField | undefined): { value: string; label: string }[] {
  return (field?.options ?? []).map((o) => (typeof o === 'string' ? { value: o, label: o } : { value: o.value, label: o.label }));
}

// ---------------------------------------------------------------------------------------------------------------
// Moeda (itens 8 e 11)
// ---------------------------------------------------------------------------------------------------------------

export interface CurrencyRequirement {
  measureIndex: number;
  field: string;
  /** Campo-par de moeda (`CRM_MONEY_CURRENCY_PAIRS_FE`). */
  pairField: string;
  satisfied: boolean;
}

const fieldByName = (fields: readonly ISchemaField[], name: string): ISchemaField | undefined =>
  fields.find((f) => f.name === name);

/** `sum`/`avg` em campo de dinheiro (numberFormat 'currency'). */
export function isMoneyMeasure(m: MeasureDraft, fields: readonly ISchemaField[]): boolean {
  return (m.type === 'sum' || m.type === 'avg') && m.field !== '' && isMoneyField(fieldByName(fields, m.field));
}

/** Filtro `eq`, ou `in` com um valor só, no campo-par fixa a moeda — o mesmo critério do BE (`singleCurrencyFilter`). */
export function singleCurrencyFilter(filters: readonly FilterDraft[], pairField: string): unknown {
  for (const f of filters) {
    if (f.field !== pairField) continue;
    if (f.op === 'eq' && f.value !== '' && f.value != null) return f.value;
    if (f.op === 'in' && Array.isArray(f.value) && f.value.length === 1) return f.value[0];
  }
  return undefined;
}

/** Item 8: cada soma/média de dinheiro com par exige separar por moeda (dimensão do par) ou fixar uma moeda (filtro). */
export function currencyRequirements(draft: ReportDraft, fields: readonly ISchemaField[]): CurrencyRequirement[] {
  const out: CurrencyRequirement[] = [];
  draft.measures.forEach((m, measureIndex) => {
    if (!isMoneyMeasure(m, fields)) return;
    const pairField = pairFieldOf(draft, m.field);
    // sem par, ou par ausente do schema vivo → moeda não declarada (o BE aceita e marca `undeclared`; `pairFieldOf`)
    if (!pairField || !fields.some((f) => f.name === pairField)) return;
    const byDimension = draft.dimensions.some((d) => d.type === 'field' && d.field === pairField);
    const byFilter = singleCurrencyFilter(draft.filters, pairField) !== undefined;
    out.push({ measureIndex, field: m.field, pairField, satisfied: byDimension || byFilter });
  });
  return out;
}

/**
 * Par de moeda de um campo de dinheiro — na fonte, ou no join com o prefixo do apelido (`apelido.currency`), como o
 * `pairFieldOf` do BE.
 */
function pairFieldOf(draft: ReportDraft, field: string): string | undefined {
  const dot = field.indexOf('.');
  if (dot < 0) return draft.source ? CRM_MONEY_CURRENCY_PAIRS_FE[draft.source]?.[field] : undefined;
  const alias = field.slice(0, dot);
  const join = draft.joins.find((j) => j.alias === alias);
  const pair = join?.rightSource ? CRM_MONEY_CURRENCY_PAIRS_FE[join.rightSource]?.[field.slice(dot + 1)] : undefined;
  return pair ? `${alias}.${pair}` : undefined;
}

/** Item 11: a conversão para R$ só existe com medida de dinheiro que tem par de moeda. */
export function conversionAvailable(draft: ReportDraft, fields: readonly ISchemaField[]): boolean {
  return currencyRequirements(draft, fields).length > 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Tipo e gráfico (item 12, F-FRB6)
// ---------------------------------------------------------------------------------------------------------------

/** `table` só com `kind:'table'`; KPI e gráfico escolhem entre os gráficos (KPI: decisão do dono, PR-A lacunas). */
export function allowedChartTypes(kind: ReportKind): readonly ReportChartType[] {
  return kind === 'table' ? ['table'] : CHART_TYPES_GRAPHIC;
}

/** F-FRB6=(a): KPI não tem dimensão, salvo a de moeda (um card por moeda). */
export function kpiAllowedDimensionFields(draft: ReportDraft, fields: readonly ISchemaField[]): string[] {
  return Array.from(new Set(currencyRequirements(draft, fields).map((r) => r.pairField)));
}

/** Ajusta o rascunho ao trocar o tipo: chartType válido e, no KPI, só a dimensão de moeda. */
export function withKind(draft: ReportDraft, kind: ReportKind, fields: readonly ISchemaField[]): ReportDraft {
  const chartTypes = allowedChartTypes(kind);
  const chartType = chartTypes.includes(draft.chartType) ? draft.chartType : chartTypes[0];
  if (kind !== 'kpi') return settle({ ...draft, kind, chartType }, fields);
  const allowed = new Set(kpiAllowedDimensionFields(draft, fields));
  const dimensions = draft.dimensions.filter((d) => d.type === 'field' && allowed.has(d.field));
  const sort = draft.sort?.by === 'dimension' && dimensions.length === 0 ? null : draft.sort;
  return settle({ ...draft, kind, chartType, dimensions, sort }, fields);
}

// ---------------------------------------------------------------------------------------------------------------
// Fonte (item 3)
// ---------------------------------------------------------------------------------------------------------------

/** Item 3: fontes da whitelist que estão instaladas (cruzando `getTables()` por `internalName`). */
export function installedSources(internalNames: readonly (string | null | undefined)[]): ReportSource[] {
  const present = new Set(internalNames.filter((n): n is string => Boolean(n)));
  return REPORT_SOURCES.filter((s) => present.has(s));
}

/**
 * O que deixa de existir ao trocar a fonte: joins cujo campo da esquerda some da fonte nova e itens que citam campo
 * ausente. `sourceFields` = campos da fonte nova (com sintéticos).
 */
export function prunedForFields(draft: ReportDraft, sourceFields: readonly ISchemaField[], rightFieldsOf: RightFieldsOf = noRightFields): ReportDraft {
  const own = sourceOnly(sourceFields);
  const joins = draft.joins.filter((j) => j.leftField === '' || own.some((f) => f.name === j.leftField));
  return pruneItems({ ...draft, joins }, combinedFields(own, joins, rightFieldsOf));
}

/**
 * `apelido.campo` de um join existente cujo schema não está em `fields` (não carregou) ou `apelido.id` (aceito pelo BE,
 * não oferecido): a tela não sabe se o campo existe — não poda nem desmarca nada por ele (review do PR-B, achado 5).
 */
function unresolvedJoinRef(draft: ReportDraft, fields: readonly ISchemaField[], name: string): boolean {
  const dot = name.indexOf('.');
  if (dot < 0) return false;
  const alias = name.slice(0, dot);
  if (!draft.joins.some((j) => j.alias === alias && j.rightSource)) return false;
  return name.slice(dot + 1) === 'id' || !fields.some((f) => f.name.startsWith(`${alias}.`));
}

/** Itens (medidas, agrupamentos, filtros, sort) que citam campo fora de `fields`; os joins ficam como estão. */
export function pruneItems(draft: ReportDraft, fields: readonly ISchemaField[]): ReportDraft {
  const has = (name: string) => fields.some((f) => f.name === name) || unresolvedJoinRef(draft, fields, name);
  return settle(pruneBy(draft, has), fields);
}

function pruneBy(draft: ReportDraft, has: (name: string) => boolean): ReportDraft {
  const keptIdx = draft.measures.flatMap((m, i) => (m.field === '' || has(m.field) ? [i] : []));
  const measures = keptIdx.map((i) => draft.measures[i]);
  const kept = measures.length > 0 ? measures : [{ type: 'count' as const, field: '', alias: '' }];
  const dimensions = draft.dimensions.filter((d) => has(d.type === 'field' ? d.field : d.dateField));
  const filters = draft.filters.filter((f) => has(f.field));
  // o sort aponta para a MESMA medida depois da poda (índice remapeado); medida removida → sem medida escolhida
  let sort = draft.sort;
  if (sort?.measureIndex != null) {
    const at = keptIdx.indexOf(sort.measureIndex);
    sort = { ...sort, measureIndex: at >= 0 ? at : null };
  }
  if (sort?.by === 'dimension' && dimensions.length === 0) sort = null;
  return { ...draft, measures: kept, dimensions, filters, sort };
}

/** Achado do review: a conversão marcada que deixa de valer sai do rascunho (senão o BE responde 400). */
export function settle(draft: ReportDraft, fields: readonly ISchemaField[]): ReportDraft {
  if (!draft.convertTo || conversionAvailable(draft, fields)) return draft;
  // medida de join cujo schema não carregou: não dá para saber se é dinheiro — mantém (review do PR-B, achado 5)
  if (draft.measures.some((m) => unresolvedJoinRef(draft, fields, m.field))) return draft;
  return { ...draft, convertTo: false };
}

/** Trocar a fonte limpa algo? (para pedir confirmação antes). */
export function sourceChangeLosesItems(draft: ReportDraft, nextFields: readonly ISchemaField[], rightFieldsOf: RightFieldsOf = noRightFields): boolean {
  const next = prunedForFields(draft, nextFields, rightFieldsOf);
  return next.joins.length !== draft.joins.length || itemsLost(draft, next);
}

/** A mudança `before → after` tirou medida, agrupamento ou filtro? (confirmação antes — itens 3 e 10). */
export function itemsLost(before: ReportDraft, after: ReportDraft): boolean {
  return (
    after.measures.length !== before.measures.length ||
    after.measures.some((m, i) => m.field !== before.measures[i]?.field) ||
    after.dimensions.length !== before.dimensions.length ||
    after.filters.length !== before.filters.length
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Bloqueio da visualização/salvamento
// ---------------------------------------------------------------------------------------------------------------

export type BlockReason =
  | 'NO_SOURCE'
  | 'JOIN_INCOMPLETE'
  | 'JOIN_ALIAS_INVALID'
  | 'MEASURE_FIELD_REQUIRED'
  | 'CURRENCY_CHOICE_REQUIRED'
  | 'SORT_KEY_REQUIRED'
  | 'FILTER_INCOMPLETE'
  | 'KPI_DIMENSION'
  | 'LIMIT_RANGE';

/** Primeiro motivo que impede visualizar (itens 5, 7, 8, 9, F-FRB6); `null` = pode enviar. */
export function blockReason(draft: ReportDraft, fields: readonly ISchemaField[]): BlockReason | null {
  if (!draft.source) return 'NO_SOURCE';
  if (draft.joins.some((j) => !j.rightSource || j.leftField === '' || j.rightField === '')) return 'JOIN_INCOMPLETE';
  if (
    draft.joins.some(
      (j, i) =>
        aliasProblem(j.alias, i, draft.joins, fields) !== null ||
        (j.pendingAlias !== undefined && aliasProblem(j.pendingAlias, i, draft.joins, fields) !== null),
    )
  ) {
    return 'JOIN_ALIAS_INVALID';
  }
  if (draft.measures.some((m) => m.type !== 'count' && m.field === '')) return 'MEASURE_FIELD_REQUIRED';
  if (
    draft.filters.some(
      (f) => f.field === '' || (isMultiValueOp(f.op) ? !Array.isArray(f.value) || f.value.length === 0 : f.value === '' || f.value == null),
    )
  ) {
    return 'FILTER_INCOMPLETE';
  }
  if (currencyRequirements(draft, fields).some((r) => !r.satisfied)) return 'CURRENCY_CHOICE_REQUIRED';
  if (draft.sort?.by === 'measure' && draft.measures.length > 1 && draft.sort.measureIndex == null) return 'SORT_KEY_REQUIRED';
  if (draft.kind === 'kpi') {
    const allowed = new Set(kpiAllowedDimensionFields(draft, fields));
    if (draft.dimensions.some((d) => d.type !== 'field' || !allowed.has(d.field))) return 'KPI_DIMENSION';
  }
  if (draft.limit != null && (!Number.isInteger(draft.limit) || draft.limit < 1 || draft.limit > MAX_LIMIT)) return 'LIMIT_RANGE';
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Rascunho ⇄ contrato
// ---------------------------------------------------------------------------------------------------------------

function toMeasure(m: MeasureDraft): SpecMeasure {
  const alias = m.alias.trim();
  if (m.type === 'count') {
    if (m.field && alias) return { type: 'count', field: m.field, alias };
    if (m.field) return { type: 'count', field: m.field };
    return alias ? { type: 'count', alias } : { type: 'count' };
  }
  return alias ? { type: m.type, field: m.field, alias } : { type: m.type, field: m.field };
}

function toDimension(d: DimensionDraft): SpecDimension {
  if (d.type === 'field') return d.label ? { type: 'field', field: d.field, label: d.label } : { type: 'field', field: d.field };
  return d.label
    ? { type: 'period', dateField: d.dateField, period: d.period, label: d.label }
    : { type: 'period', dateField: d.dateField, period: d.period };
}

function toFilter(f: FilterDraft): SpecFilter {
  return { field: f.field, op: f.op, value: f.value };
}

/** O apelido vai sempre (obrigatório na tela). */
function toJoin(j: JoinDraft, rightSource: ReportSource): SpecJoin {
  return { leftField: j.leftField, rightSource, rightField: j.rightField, alias: j.alias };
}

function toSort(sort: SortDraft, measures: readonly MeasureDraft[]): SpecSort {
  if (sort.by === 'dimension') return { by: 'dimension', dir: sort.dir };
  const m = sort.measureIndex != null ? measures[sort.measureIndex] : undefined;
  return m ? { by: 'measure', key: measureKey(m), dir: sort.dir } : { by: 'measure', dir: sort.dir };
}

/** Rascunho → spec do contrato gerado; `null` sem fonte ou sem medida. Chaves ausentes nunca vão (BE `.strict()`). */
export function toSpec(draft: ReportDraft): ReportSpec | null {
  const measures = nonEmpty(draft.measures.map(toMeasure));
  if (!draft.source || !measures) return null;
  const spec: ReportSpec = { source: draft.source, measures };
  const joins = draft.joins.flatMap((j) => (j.rightSource ? [toJoin(j, j.rightSource)] : []));
  if (joins.length > 0) spec.joins = joins;
  if (draft.filters.length > 0) spec.filters = draft.filters.map(toFilter);
  if (draft.dimensions.length > 0) spec.dimensions = draft.dimensions.map(toDimension);
  if (draft.sort) spec.sort = toSort(draft.sort, draft.measures);
  if (draft.limit != null) spec.limit = draft.limit;
  if (draft.convertTo) spec.convertTo = 'BRL';
  return spec;
}

/** Corpo do POST (salvar novo / salvar como). */
export function toCreateInput(draft: ReportDraft, name: string = draft.name): CreateCrmReportInput | null {
  const spec = toSpec(draft);
  const trimmed = name.trim();
  if (!spec || !trimmed) return null;
  const description = draft.description.trim();
  return description
    ? { name: trimmed, description, kind: draft.kind, chartType: draft.chartType, spec }
    : { name: trimmed, kind: draft.kind, chartType: draft.chartType, spec };
}

/** Item 17: PUT só com o que mudou; `null` = nada a salvar. */
export function buildPatch(saved: CrmReportRow, draft: ReportDraft): UpdateCrmReportInput | null {
  const spec = toSpec(draft);
  const patch: UpdateCrmReportInput = {};
  const name = draft.name.trim();
  if (name && name !== saved.name) patch.name = name;
  const description = draft.description.trim();
  if (description !== (saved.description ?? '')) patch.description = description;
  if (draft.kind !== saved.kind) patch.kind = draft.kind;
  if (draft.chartType !== saved.chartType) patch.chartType = draft.chartType;
  if (spec && JSON.stringify(spec) !== JSON.stringify(normalizedSpec(saved.spec))) patch.spec = spec;
  return Object.keys(patch).length > 0 ? patch : null;
}

/** O spec salvo passa pelo mesmo caminho do rascunho, para a comparação não acusar diferença de forma. */
function normalizedSpec(spec: ReportSpec): ReportSpec | null {
  return toSpec(fromSpec(spec, emptyDraft()));
}

function fromMeasure(m: SpecMeasure): MeasureDraft {
  return { type: m.type, field: m.field ?? '', alias: m.alias ?? '' };
}

function fromDimension(d: SpecDimension): DimensionDraft {
  if (d.type === 'field') return d.label ? { type: 'field', field: d.field, label: d.label } : { type: 'field', field: d.field };
  return d.label
    ? { type: 'period', dateField: d.dateField, period: d.period, label: d.label }
    : { type: 'period', dateField: d.dateField, period: d.period };
}

function fromFilter(f: SpecFilter): FilterDraft {
  return { field: f.field, op: f.op, value: f.value };
}

/** Join salvo sem apelido usa o padrão do BE (`DEFAULT_JOIN_ALIAS = 'right'`) — as referências `right.campo` seguem valendo. */
function fromJoin(j: SpecJoin): JoinDraft {
  return { rightSource: j.rightSource, leftField: j.leftField, rightField: j.rightField, alias: j.alias ?? 'right' };
}

function fromSpec(spec: ReportSpec, base: ReportDraft): ReportDraft {
  const measures = spec.measures.map(fromMeasure);
  let sort: SortDraft | null = null;
  if (spec.sort) {
    const key = spec.sort.key;
    const idx = spec.sort.by === 'measure' && key ? measures.findIndex((m) => measureKey(m) === key) : -1;
    sort = { by: spec.sort.by, measureIndex: idx >= 0 ? idx : null, dir: spec.sort.dir ?? 'asc' };
  }
  return {
    ...base,
    source: spec.source,
    measures,
    dimensions: (spec.dimensions ?? []).map(fromDimension),
    filters: (spec.filters ?? []).map(fromFilter),
    sort,
    limit: spec.limit ?? null,
    convertTo: spec.convertTo === 'BRL',
    joins: (spec.joins ?? []).map(fromJoin),
  };
}

/** Item 18: relatório salvo → rascunho do editor. */
export function fromReport(row: CrmReportRow): ReportDraft {
  return fromSpec(row.spec, {
    ...emptyDraft(),
    name: row.name,
    description: row.description ?? '',
    kind: row.kind,
    chartType: row.chartType,
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Resultado (itens 14–15)
// ---------------------------------------------------------------------------------------------------------------

export type CurrencyMeta = CrmReportRunOutput['meta']['currency'];
export type PointCurrency = CurrencyCode | typeof NO_CURRENCY_KEY | null;
const SEPARATOR = ' | ';

const asPointCurrency = (v: string): PointCurrency =>
  v === NO_CURRENCY_KEY || (CURRENCY_CODES as readonly string[]).includes(v) ? (v as PointCurrency) : null; // ponytail: folha string → união

/**
 * Item 14: moeda de um ponto. `dimension` → a parte do nome que vem da dimensão de moeda (1ª ou 2ª — os códigos não
 * contêm o separador, então corta-se no 1º/último " | "); `filter` → a moeda do filtro; senão `null`.
 */
export function pointCurrency(name: string, meta: CurrencyMeta, dimensions: readonly DimensionDraft[]): PointCurrency {
  if (!meta) return null;
  if (meta.mode === 'filter') return meta.value;
  if (meta.mode !== 'dimension') return null;
  const idx = dimensions.findIndex((d) => d.type === 'field' && d.field === meta.field);
  if (idx < 0) return null;
  if (dimensions.length === 1) return asPointCurrency(name);
  if (idx === 0) {
    const cut = name.indexOf(SEPARATOR);
    return asPointCurrency(cut < 0 ? name : name.slice(0, cut));
  }
  const cut = name.lastIndexOf(SEPARATOR);
  return asPointCurrency(cut < 0 ? name : name.slice(cut + SEPARATOR.length));
}

/** F-FRB7=(a): o nome vem como o BE manda; só `__NO_CURRENCY__` vira rótulo. */
export function displayPointName(name: string, noCurrencyLabel: string): string {
  return name.split(NO_CURRENCY_KEY).join(noCurrencyLabel);
}

/** Valor formatado: com moeda (BRL/USD/EUR) no símbolo da moeda; sem moeda, número simples. */
export function formatReportValue(value: number, currency: PointCurrency, locale: string): string {
  if (currency && currency !== NO_CURRENCY_KEY) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

/**
 * Achado do review: o `meta.currency` do BE descreve a moeda pelo par da 1ª medida de dinheiro (`currencyMode`). Só as
 * medidas de dinheiro cujo par é esse campo levam símbolo; dinheiro sem par (ou modo `undeclared`) fica sem símbolo.
 */
export function currencyIndexes(draft: ReportDraft, fields: readonly ISchemaField[], meta: CurrencyMeta): number[] {
  if (!meta || meta.mode === 'undeclared') return [];
  const byMeasure = new Map(currencyRequirements(draft, fields).map((r) => [r.measureIndex, r.pairField]));
  return draft.measures.flatMap((_, i) => (byMeasure.get(i) === meta.field ? [i] : []));
}

export interface SeriesView {
  /** Chave estável (série + grupo de moeda). */
  key: string;
  measure: string;
  /** Moeda do grupo quando a série monetária foi separada por moeda (decisão do dono, PR-A lacunas). */
  currency: PointCurrency;
  money: boolean;
  points: { name: string; value: number }[];
}

/**
 * Item 14 + lacuna "um gráfico por moeda": cada série vira uma vista; série monetária em modo `dimension` vira uma vista
 * por moeda (USD e BRL nunca no mesmo eixo). `moneyIndexes` = posições das medidas de dinheiro no spec (série i ↔
 * medida i, F-RB10).
 */
export function seriesViews(
  output: Pick<CrmReportRunOutput, 'series' | 'meta'>,
  dimensions: readonly DimensionDraft[],
  moneyIndexes: ReadonlySet<number>,
): SeriesView[] {
  const meta = output.meta.currency;
  const out: SeriesView[] = [];
  output.series.forEach((s, i) => {
    const money = moneyIndexes.has(i);
    if (!money || meta?.mode !== 'dimension') {
      const currency = money ? pointCurrency('', meta, dimensions) : null;
      out.push({ key: `${i}`, measure: s.measure, currency, money, points: s.points.map((p) => ({ name: p.name, value: p.value })) });
      return;
    }
    const groups = new Map<string, { name: string; value: number }[]>();
    for (const p of s.points) {
      const c = pointCurrency(p.name, meta, dimensions) ?? NO_CURRENCY_KEY;
      const list = groups.get(c) ?? [];
      list.push({ name: p.name, value: p.value });
      groups.set(c, list);
    }
    groups.forEach((points, c) => {
      out.push({ key: `${i}:${c}`, measure: s.measure, currency: asPointCurrency(c), money, points });
    });
  });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Erros nomeados (item 16)
// ---------------------------------------------------------------------------------------------------------------

const KNOWN_ERROR_CODES = new Set([
  'REPORT_FIELD_NOT_FOUND',
  'REPORT_TOO_LARGE',
  'REPORT_SOURCE_NOT_ALLOWED',
  'REPORT_CURRENCY_MIXED',
  'REPORT_CONVERSION_NOT_APPLICABLE',
  'REPORT_SORT_KEY_REQUIRED',
  'REPORT_SORT_KEY_NOT_FOUND',
  'REPORT_JOIN_ALIAS_DUPLICATE',
  'REPORT_NOT_FOUND',
  'INVALID_TIME_ZONE',
  'CRM_MODULE_NOT_INSTALLED',
]);

export interface ReportErrorView {
  /** Chave i18n no namespace `crm`. */
  key: string;
  params: Record<string, unknown>;
  code: string | null;
}

/** O `apiClient` lança `{ ...corpo, status }`; o corpo traz `code` (e `details` nos erros com dados). */
export function reportError(err: unknown): ReportErrorView {
  const body = (typeof err === 'object' && err !== null ? err : {}) as { code?: unknown; details?: unknown };
  const code = typeof body.code === 'string' ? body.code : null;
  const params = typeof body.details === 'object' && body.details !== null ? (body.details as Record<string, unknown>) : {};
  if (code && KNOWN_ERROR_CODES.has(code)) return { key: `report_builder.errors.${code}`, params, code };
  return { key: 'report_builder.errors.GENERIC', params: {}, code };
}

export const browserTimeZone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};
