import { z } from 'zod';

/**
 * BE-INCR-CRM-REPORT-BUILDER PR-2 (nó CRM-RB) — contratos do builder de relatórios do CRM, materializados do BRIEF §3
 * (`docs/crm/BE-INCR-CRM-REPORT-BUILDER-brief.md`; emendas 29/09 — F-RB8 — e 06/10 — F-RB9..11).
 *
 * O que NÃO cabe no Zod e é validado no serviço (depende do schema vivo das tabelas): campo inexistente
 * (`REPORT_FIELD_NOT_FOUND`), regra de moeda (`REPORT_CURRENCY_MIXED`, item 17), `sort.key` sem medida
 * (`REPORT_SORT_KEY_NOT_FOUND`) e `convertTo` sem medida monetária com par (`REPORT_CONVERSION_NOT_APPLICABLE`).
 */

// Fonte: nome interno de tabela CRM (whitelist por F-RB3), resolvido server-side para a tabela do dono do relatório.
export const CRM_REPORT_SOURCES = ['leads', 'crmOpportunities', 'leadActivities', 'leadProposals', 'crmAccounts', 'crmContacts'] as const;
export type CrmReportSource = (typeof CRM_REPORT_SOURCES)[number];

// F-RB8 (29/09): par valor→moeda dos campos monetários de preset. Campo monetário = numberFormat 'currency' no schema vivo.
export const CRM_MONEY_CURRENCY_PAIRS = {
  leads: { latestProposalAmount: 'latestProposalCurrency' }, // LeadsModule.ts — moeda opcional, sem default
  leadProposals: { amount: 'currency' }, // LeadProposalsModule.ts — moeda obrigatória
  crmOpportunities: { amount: 'currency' }, // OpportunitiesModule.ts — moeda opcional, default BRL
} as const satisfies Partial<Record<CrmReportSource, Record<string, string>>>;

/** Chave estável do grupo de moeda vazia (item 18, F-RB8c); o rótulo é do FE (i18n `crm.report_builder.labels`). */
export const NO_CURRENCY_KEY = '__NO_CURRENCY__';

const FieldRef = z.string().trim().min(1).max(64);
const SourceEnum = z.enum(CRM_REPORT_SOURCES, { message: 'REPORT_SOURCE_NOT_ALLOWED' });

export const ReportFilterSchema = z
  .object({
    field: FieldRef,
    op: z.enum(['eq', 'ne', 'in', 'nin', 'gt', 'gte', 'lt', 'lte']), // = FilterOp do PipelineSpec
    value: z.unknown(),
  })
  .strict();

export const ReportDimensionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('field'), field: FieldRef, label: z.string().max(80).optional() }).strict(),
  z
    .object({
      type: z.literal('period'),
      dateField: FieldRef, // inclui os sintéticos _createdAt/_updatedAt
      period: z.enum(['day', 'week', 'month', 'quarter', 'year']),
      label: z.string().max(80).optional(),
    })
    .strict(),
]);

export const ReportMeasureSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('count'), field: FieldRef.optional(), alias: z.string().max(40).optional() }).strict(),
  z.object({ type: z.literal('sum'), field: FieldRef, alias: z.string().max(40).optional() }).strict(),
  z.object({ type: z.literal('avg'), field: FieldRef, alias: z.string().max(40).optional() }).strict(),
  // 'formula' do PipelineSpec FORA do v1 — F-RB5
]);

export const ReportJoinSchema = z
  .object({
    leftField: FieldRef,
    rightSource: SourceEnum,
    rightField: FieldRef,
    alias: z.string().max(40).optional(),
  })
  .strict();

export const ReportSortSchema = z
  .object({
    by: z.enum(['dimension', 'measure']),
    key: z.string().trim().min(1).max(64).optional(),
    dir: z.enum(['asc', 'desc']).optional(),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     CrmReportSpec:
 *       type: object
 *       required: [source, measures]
 *       properties:
 *         source: { type: string, enum: [leads, crmOpportunities, leadActivities, leadProposals, crmAccounts, crmContacts] }
 *         joins: { type: array, maxItems: 2, items: { type: object } }
 *         filters: { type: array, maxItems: 10, items: { type: object } }
 *         dimensions: { type: array, maxItems: 2, items: { type: object } }
 *         measures: { type: array, minItems: 1, maxItems: 4, items: { type: object } }
 *         sort: { type: object, properties: { by: { type: string, enum: [dimension, measure] }, key: { type: string }, dir: { type: string, enum: [asc, desc] } } }
 *         limit: { type: integer, minimum: 1, maximum: 500 }
 *         convertTo: { type: string, enum: [BRL] }
 */
export const ReportSpecSchema = z
  .object({
    source: SourceEnum,
    joins: z.array(ReportJoinSchema).max(2).optional(), // F-RB5
    filters: z.array(ReportFilterSchema).max(10).optional(),
    dimensions: z.array(ReportDimensionSchema).max(2).optional(),
    // F-RB10=(a): o serviço chama o agregador uma vez por medida → uma série por medida; teto de 4 do F-RB5
    measures: z.array(ReportMeasureSchema).min(1).max(4),
    // F-RB9=(a): aplicado pelo SERVIÇO depois da agregação (o agregador ordena só por nome e corta antes — §9 E1)
    sort: ReportSortSchema.optional(),
    limit: z.number().int().min(1).max(500).optional(), // aplicado pelo serviço junto com o sort
    convertTo: z.literal('BRL').optional(), // F-RB8: visão convertida À PARTE; sem .default() (Zod 4 × partial)
  })
  .strict()
  .refine((s) => !(s.sort?.by === 'measure' && s.measures.length > 1 && !s.sort.key), {
    message: 'REPORT_SORT_KEY_REQUIRED',
    path: ['sort', 'key'],
  });

// F-RB11=(b): fuso IANA do cliente no run, validado; default 'America/Sao_Paulo' aplicado no SERVIÇO.
const TimeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(
    (tz) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'INVALID_TIME_ZONE' },
  );

/** @openapi
 * components:
 *   schemas:
 *     CreateCrmReport:
 *       type: object
 *       required: [name, kind, chartType, spec]
 *       properties:
 *         name: { type: string, minLength: 1, maxLength: 80 }
 *         description: { type: string, maxLength: 500 }
 *         kind: { type: string, enum: [chart, table, kpi] }
 *         chartType: { type: string, enum: [bar, line, area, pie, donut, table] }
 *         spec: { $ref: '#/components/schemas/CrmReportSpec' }
 */
export const CreateCrmReportSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().max(500).optional(),
    kind: z.enum(['chart', 'table', 'kpi']),
    chartType: z.enum(['bar', 'line', 'area', 'pie', 'donut', 'table']), // = CHART_TYPES do AnalyticsDefinitionDto
    spec: ReportSpecSchema,
  })
  .strict();

export const UpdateCrmReportSchema = CreateCrmReportSchema.partial().refine((b) => Object.keys(b).length > 0, {
  message: 'At least one field must be provided.',
});

/** Preview sem salvar (item 8). O timeZone NÃO é salvo no spec: é do cliente (F-RB11). */
export const RunCrmReportSchema = z.object({ spec: ReportSpecSchema, timeZone: TimeZoneSchema.optional() }).strict();
/** POST /:id/run (F-RB11). */
export const RunSavedCrmReportSchema = z.object({ timeZone: TimeZoneSchema.optional() }).strict();

// --- Saída (item 25: entra no snapshot de shape) — cada série reusa ChartDataPoint ---

const ChartDataPointSchema = z.object({
  name: z.string(),
  value: z.number(),
  recordIds: z.array(z.string()).optional(),
  tableSource: z.string().optional(),
});

export const ReportSeriesSchema = z.object({
  measure: z.string(), // alias, ou `${type}:${field ?? '*'}` — a chave do sort.key (F-RB9)
  points: z.array(ChartDataPointSchema), // mesmo conjunto e ordem de pontos em todas as séries
});

const CurrencyCodeSchema = z.enum(['BRL', 'USD', 'EUR']);

export const CurrencyModeSchema = z.union([
  z.null(), // relatório sem medida monetária
  z.object({ mode: z.literal('dimension'), field: z.string() }), // um ponto por moeda
  z.object({ mode: z.literal('filter'), field: z.string(), value: CurrencyCodeSchema }),
  z.object({ mode: z.literal('undeclared') }), // F-RB8d: campo monetário sem par
]);

export const PtaxRateViewSchema = z.object({
  currency: z.enum(['USD', 'EUR']),
  side: z.literal('venda'), // F-RB8e
  rate: z.number(), // sellRateE5 / 1e5
  rateDate: z.string(), // YYYY-MM-DD — sempre exibida
  stale: z.boolean(), // F-RB8b: referência − rateDate > 5 dias corridos
  source: z.literal('BCB_PTAX_FECHAMENTO'),
});

export const ConvertedViewSchema = z.object({
  target: z.literal('BRL'),
  referenceDate: z.string(), // F-RB8a: dia da consulta (Brasília) — câmbio SIMULADO
  rates: z.array(PtaxRateViewSchema),
  series: z.array(ReportSeriesSchema), // só medidas monetárias com par; dimensão de moeda colapsada
  excluded: z.array(
    z.object({
      reason: z.enum(['NO_CURRENCY', 'UNDECLARED_CURRENCY', 'RATE_UNAVAILABLE']),
      measure: z.string().optional(),
      currency: z.string().optional(),
      rows: z.number().int(),
    }),
  ),
});

export const RunCrmReportOutputSchema = z.object({
  series: z.array(ReportSeriesSchema), // VERDADE — uma por medida (F-RB10), nunca mistura moedas
  meta: z.object({
    rowsRead: z.number().int(),
    truncated: z.literal(false),
    currency: CurrencyModeSchema,
    timeZone: z.string(), // fuso efetivo (F-RB11)
  }),
  converted: ConvertedViewSchema.optional(), // só com spec.convertTo; nunca substitui series
});

export type ReportSpec = z.infer<typeof ReportSpecSchema>;
export type ReportMeasure = z.infer<typeof ReportMeasureSchema>;
export type ReportDimension = z.infer<typeof ReportDimensionSchema>;
export type ReportFilter = z.infer<typeof ReportFilterSchema>;
export type CreateCrmReportInput = z.infer<typeof CreateCrmReportSchema>;
export type UpdateCrmReportInput = z.infer<typeof UpdateCrmReportSchema>;
export type RunCrmReportInput = z.infer<typeof RunCrmReportSchema>;
export type RunSavedCrmReportInput = z.infer<typeof RunSavedCrmReportSchema>;
export type ReportSeries = z.infer<typeof ReportSeriesSchema>;
export type CurrencyMode = z.infer<typeof CurrencyModeSchema>;
export type PtaxRateView = z.infer<typeof PtaxRateViewSchema>;
export type ConvertedView = z.infer<typeof ConvertedViewSchema>;
export type RunCrmReportOutput = z.infer<typeof RunCrmReportOutputSchema>;
