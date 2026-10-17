import React, { useMemo } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'next-i18next';
import ChartRenderer from '../../../dashboard/category-views/finance/components/analytics/charts/ChartRenderer';
import DashboardKpiCard from '../../../dashboard/category-views/finance/components/analytics/dashboard/DashboardKpiCard';
import type { ChartPreset, ChartType } from '../../../dashboard/category-views/finance/types/analytics.types';
import { GenericTable } from '../../../dashboard/category-views/shared/components/GenericTable';
import type { ITableSchema, ISchemaField } from '../../../dashboard/components/shared/dynamic-tables.client';
import type { CrmReportRunOutput } from '../../../../lib/services/crmReports.service';
import { formatDate } from '../../lib/dates';
import { measureText } from './CrmReportEditor';
import {
  NO_CURRENCY_KEY,
  currencyIndexes,
  displayPointName,
  fieldLabel,
  formatReportValue,
  pointCurrency,
  seriesViews,
  type DimensionDraft,
  type PointCurrency,
  type ReportChartType,
  type ReportDraft,
  type ReportKind,
  type SeriesView,
} from '../../lib/reportBuilder';

/**
 * Resultado do builder (FE-INCR-CRM-REPORT-BUILDER PR-A, itens 14–15).
 * - Verdade: uma série por medida (F-FRB3=(a): um gráfico por medida); série de dinheiro separada por moeda vira um
 *   gráfico por moeda ([[D-2026-10-13-FE-CRM-RB-PR-A-LACUNAS]]); `kind:'table'` → `GenericTable` só leitura, uma coluna
 *   por série; `kind:'kpi'` → um `DashboardKpiCard` por ponto (um por moeda).
 * - Convertido: bloco SEPARADO, rotulado como estimativa pela PTAX de venda; nunca substitui a verdade.
 * O snapshot (`dimensions`, `moneyIndexes`, rótulos) é o do momento do run — editar depois não desalinha o resultado.
 */
export interface ReportRunSnapshot {
  output: CrmReportRunOutput;
  kind: ReportKind;
  chartType: ReportChartType;
  dimensions: DimensionDraft[];
  /** Posições das medidas de dinheiro no spec (série i ↔ medida i, F-RB10). */
  moneyIndexes: number[];
  /** Rótulo legível de cada série, na ordem do spec. */
  measureLabels: string[];
  /** Rótulo da coluna de agrupamento na tabela. */
  groupLabel: string;
}

/**
 * Snapshot de um run para o render (builder e widget do dashboard — item 20 reusa o render do item 14): moeda por
 * medida, rótulos das séries e da coluna de agrupamento, tudo do rascunho que gerou o run.
 */
export function buildRunSnapshot(
  output: CrmReportRunOutput,
  draft: ReportDraft,
  fields: readonly ISchemaField[],
  t: TFunction<'crm'>,
): ReportRunSnapshot {
  return {
    output,
    kind: draft.kind,
    chartType: draft.chartType,
    dimensions: draft.dimensions,
    moneyIndexes: currencyIndexes(draft, fields, output.meta.currency),
    measureLabels: draft.measures.map((m) => measureText(m, fields, t)),
    groupLabel:
      draft.dimensions
        .map((dim) => {
          const name = dim.type === 'field' ? dim.field : dim.dateField;
          const f = fields.find((x) => x.name === name);
          return f ? fieldLabel(f) : name;
        })
        .join(' | ') || t('report_builder.result.total', 'Total'),
  };
}

const PALETTE = ['#3b82f6', '#14b8a6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#6366f1'];
const noop = () => {};
const noopAsync = async () => {};

export function CrmReportResult({ snapshot }: { snapshot: ReportRunSnapshot }) {
  const { t, i18n } = useTranslation('crm');
  const locale = i18n?.language || 'pt-BR';
  const { output } = snapshot;
  const undeclared = output.meta.currency?.mode === 'undeclared';

  return (
    <div className="flex flex-col gap-4" data-testid="report-result">
      {undeclared ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          {t('report_builder.result.undeclared', 'Moeda não declarada: os valores aparecem sem símbolo de moeda.')}
        </p>
      ) : null}
      <ResultBody
        series={output.series}
        meta={output.meta}
        snapshot={snapshot}
        locale={locale}
        forcedCurrency={null}
        idPrefix="truth"
      />
      {output.converted ? <ConvertedBlock snapshot={snapshot} locale={locale} /> : null}
    </div>
  );
}

function ResultBody({
  series,
  meta,
  snapshot,
  locale,
  forcedCurrency,
  idPrefix,
}: {
  series: CrmReportRunOutput['series'];
  meta: CrmReportRunOutput['meta'];
  snapshot: ReportRunSnapshot;
  locale: string;
  /** Bloco convertido: tudo em R$, sem separação por moeda. */
  forcedCurrency: PointCurrency;
  idPrefix: string;
}) {
  const { t } = useTranslation('crm');
  const noCurrency = t('report_builder.labels.NO_CURRENCY', 'Sem moeda');
  const moneySet = useMemo(() => new Set(snapshot.moneyIndexes), [snapshot.moneyIndexes]);
  const label = (i: number) => snapshot.measureLabels[i] ?? series[i]?.measure ?? '';
  const isMoney = (i: number) => forcedCurrency !== null || moneySet.has(i);
  const currencyOf = (i: number, name: string): PointCurrency =>
    forcedCurrency ?? (moneySet.has(i) ? pointCurrency(name, meta.currency, snapshot.dimensions) : null);
  const fmt = (i: number, name: string, value: number) => formatReportValue(value, isMoney(i) ? currencyOf(i, name) : null, locale);

  if (series.length === 0 || series.every((s) => s.points.length === 0)) {
    return <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('report_builder.result.empty', 'Sem dados para estes filtros.')}</p>;
  }

  if (snapshot.kind === 'table') {
    const fields: ISchemaField[] = [
      { name: '__group', label: snapshot.groupLabel, type: 'string' },
      ...series.map((_, i): ISchemaField => ({ name: `s${i}`, label: label(i), type: 'string' })),
    ];
    const schema: ITableSchema = { fields };
    // Verdade: alinhada por POSIÇÃO — o BE devolve o mesmo conjunto e ordem de pontos em todas as séries, e dois pontos
    // com o mesmo nome (etapas/contatos homônimos) são grupos distintos (CrmReportService, "séries desalinhadas").
    // Convertido: alinhado por NOME (o BE monta a visão convertida por nome) — 2ª passada do review do PR-A.
    const rows: { name: string; values: (number | undefined)[] }[] = [];
    if (forcedCurrency === null) {
      (series[0]?.points ?? []).forEach((p, row) => rows.push({ name: p.name, values: series.map((s) => s.points[row]?.value) }));
    } else {
      const names: string[] = [];
      for (const s of series) for (const p of s.points) if (!names.includes(p.name)) names.push(p.name);
      const byName = series.map((s) => new Map(s.points.map((p) => [p.name, p.value])));
      names.forEach((name) => rows.push({ name, values: byName.map((m) => m.get(name)) }));
    }
    const records = rows.map((r, row) => {
      const data: Record<string, unknown> = { __group: displayPointName(r.name, noCurrency) };
      r.values.forEach((value, i) => {
        data[`s${i}`] = value === undefined ? '—' : fmt(i, r.name, value);
      });
      return { id: `${idPrefix}-${row}`, data };
    });
    return (
      <div className="min-h-[200px]">
        <GenericTable
          records={records}
          schema={schema}
          tableId={`crm-report-${idPrefix}`}
          relationLookups={{}}
          onEditSuccess={noop}
          onDeleteConfirm={noopAsync}
          isWidgetMode
        />
      </div>
    );
  }

  if (snapshot.kind === 'kpi') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {series.flatMap((s, i) =>
          s.points.map((p) => (
            <DashboardKpiCard
              key={`${idPrefix}-${i}-${p.name}`}
              title={snapshot.dimensions.length > 0 || forcedCurrency ? `${label(i)} — ${displayPointName(p.name, noCurrency)}` : label(i)}
              value={fmt(i, p.name, p.value)}
              change=""
              trend="flat"
              details={[]}
              showGraph={false}
            />
          )),
        )}
      </div>
    );
  }

  const views: SeriesView[] =
    forcedCurrency !== null
      ? series.map((s, i) => ({ key: `${i}`, measure: s.measure, currency: forcedCurrency, money: true, points: s.points }))
      : seriesViews({ series, meta }, snapshot.dimensions, moneySet);
  const chartType: ChartType = snapshot.chartType === 'table' ? 'bar' : snapshot.chartType;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {views.map((v) => {
        const index = Number(v.key.split(':')[0]);
        const groupSuffix =
          v.money && meta.currency?.mode === 'dimension' && forcedCurrency === null
            ? ` — ${v.currency === NO_CURRENCY_KEY || v.currency === null ? noCurrency : v.currency}`
            : '';
        const title = `${label(index)}${groupSuffix}`;
        const symbol = v.money && v.currency && v.currency !== NO_CURRENCY_KEY ? v.currency : undefined;
        const chart: ChartPreset = {
          key: `${idPrefix}-${v.key}`,
          title,
          type: chartType,
          processor: 'crm-report',
          options: { isTemporal: false, colors: PALETTE, ...(symbol ? { currency: symbol } : {}) },
        };
        const data = v.points.map((p) => ({ name: displayPointName(p.name, noCurrency), value: p.value }));
        return (
          <div key={chart.key} data-testid={`chart-${v.key}`}>
            <ChartRenderer chart={chart} data={{ chart, data }} />
          </div>
        );
      })}
    </div>
  );
}

function ConvertedBlock({ snapshot, locale }: { snapshot: ReportRunSnapshot; locale: string }) {
  const { t } = useTranslation('crm');
  const converted = snapshot.output.converted;
  if (!converted) return null;
  // a série convertida leva a mesma chave (`measure`) da série da verdade; só as medidas de dinheiro com par entram
  const truth = snapshot.output.series;
  const convertedLabels = converted.series.map((s) => snapshot.measureLabels[truth.findIndex((x) => x.measure === s.measure)] ?? s.measure);
  const convertedSnapshot: ReportRunSnapshot = {
    ...snapshot,
    // a dimensão de moeda foi colapsada pelo BE
    measureLabels: convertedLabels,
    moneyIndexes: convertedLabels.map((_, j) => j),
    dimensions: snapshot.dimensions.filter((d) => !(d.type === 'field' && snapshot.output.meta.currency?.mode === 'dimension' && d.field === snapshot.output.meta.currency.field)),
  };
  return (
    <section
      data-testid="report-converted"
      className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20"
    >
      <h3 className="text-sm font-black text-gray-900 dark:text-white">
        {t('report_builder.converted.title', {
          defaultValue: 'Estimativa em R$ pela PTAX de venda de {{date}} — não é número contábil',
          date: formatDate(converted.referenceDate, undefined, locale),
        })}
      </h3>
      <ul className="mt-2 flex flex-col gap-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
        {converted.rates.map((r) => (
          <li key={r.currency}>
            {t('report_builder.converted.rate', {
              defaultValue: '{{currency}}: {{rate}} (taxa de {{date}})',
              currency: r.currency,
              rate: new Intl.NumberFormat(locale, { maximumFractionDigits: 5 }).format(r.rate),
              date: formatDate(r.rateDate, undefined, locale),
            })}
            {r.stale ? (
              <span className="ml-2 rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {t('report_builder.converted.stale', 'taxa com mais de 5 dias')}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <ResultBody
          series={converted.series}
          meta={snapshot.output.meta}
          snapshot={convertedSnapshot}
          locale={locale}
          forcedCurrency="BRL"
          idPrefix="converted"
        />
      </div>
      {converted.excluded.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('report_builder.converted.excluded', 'Fora da conversão')}
          </p>
          <ul className="mt-1 flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300" data-testid="report-excluded">
            {converted.excluded.map((x, i) => (
              <li key={i}>
                {t(`report_builder.labels.${x.reason}`, x.reason)}
                {x.currency ? ` (${x.currency})` : ''}:{' '}
                {t('report_builder.converted.rows', { defaultValue: '{{n}} linha(s)', n: x.rows })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
