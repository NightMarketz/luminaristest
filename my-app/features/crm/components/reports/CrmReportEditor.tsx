import React from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'next-i18next';
import type { ISchemaField } from '../../../dashboard/components/shared/dynamic-tables.client';
import {
  FILTER_OPS,
  KINDS,
  MAX_DIMENSIONS,
  MAX_FILTERS,
  MAX_LIMIT,
  MAX_MEASURES,
  PERIODS,
  allowedChartTypes,
  coerceFilterValue,
  conversionAvailable,
  currencyRequirements,
  fieldLabel,
  isMoneyField,
  isMultiValueOp,
  measureFieldOptions,
  periodFieldOptions,
  selectOptions,
  withKind,
  type DimensionDraft,
  type FilterDraft,
  type FilterOp,
  type MeasureDraft,
  type MeasureType,
  type PeriodUnit,
  type ReportChartType,
  type ReportDraft,
  type ReportKind,
  type ReportSource,
} from '../../lib/reportBuilder';

/**
 * Editor do builder de relatórios do CRM (FE-INCR-CRM-REPORT-BUILDER PR-A, itens 3–9, 11, 12). Controlado: recebe o
 * rascunho e devolve o próximo. A troca de fonte sobe ao pai (`onSourceChange`), que carrega o schema novo e pede
 * confirmação antes de limpar o que deixa de existir (item 3). Joins ficam para o PR-B (F-FRB5).
 */
export interface CrmReportEditorProps {
  draft: ReportDraft;
  /** Campos da fonte (schema vivo + sintéticos); `null` sem fonte ou carregando. */
  fields: ISchemaField[] | null;
  sources: ReportSource[];
  onChange: (next: ReportDraft) => void;
  onSourceChange: (source: ReportSource) => void;
}

const MEASURE_TYPES: readonly MeasureType[] = ['count', 'sum', 'avg'];
const CURRENCY_FALLBACK = ['BRL', 'USD', 'EUR'];

const inputCls =
  'rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white';
const sectionCls = 'rounded-2xl border border-gray-200 p-4 dark:border-neutral-800';
const titleCls = 'mb-3 text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400';
const smallBtn =
  'rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-800';

export function CrmReportEditor({ draft, fields, sources, onChange, onSourceChange }: CrmReportEditorProps) {
  const { t } = useTranslation('crm');
  const list = fields ?? [];
  const byName = (name: string) => list.find((f) => f.name === name);
  const fieldOptionLabel = (f: ISchemaField) =>
    isMoneyField(f) ? `${fieldLabel(f)} ${t('report_builder.editor.money_suffix', '(dinheiro)')}` : fieldLabel(f);

  const set = (patch: Partial<ReportDraft>) => onChange({ ...draft, ...patch });
  const setMeasure = (i: number, m: MeasureDraft) => set({ measures: draft.measures.map((x, j) => (j === i ? m : x)) });
  const setDimension = (i: number, d: DimensionDraft) => set({ dimensions: draft.dimensions.map((x, j) => (j === i ? d : x)) });
  const setFilter = (i: number, f: FilterDraft) => set({ filters: draft.filters.map((x, j) => (j === i ? f : x)) });

  const requirements = currencyRequirements(draft, list);
  const canConvert = conversionAvailable(draft, list);
  const isKpi = draft.kind === 'kpi';

  return (
    <div className="flex flex-col gap-4">
      {/* Nome, descrição, tipo e gráfico (item 12) */}
      <section className={sectionCls}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-bold text-gray-600 dark:text-gray-300">
            {t('report_builder.editor.name', 'Nome')}
            <input className={inputCls} value={draft.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-gray-600 dark:text-gray-300">
            {t('report_builder.editor.description', 'Descrição')}
            <input
              className={inputCls}
              value={draft.description}
              maxLength={500}
              onChange={(e) => set({ description: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-gray-600 dark:text-gray-300">
            {t('report_builder.editor.kind', 'Tipo')}
            <select
              aria-label={t('report_builder.editor.kind', 'Tipo')}
              className={inputCls}
              value={draft.kind}
              onChange={(e) => onChange(withKind(draft, e.target.value as ReportKind, list))} // ponytail: folha string → união
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`report_builder.kind.${k}`, k)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-gray-600 dark:text-gray-300">
            {t('report_builder.editor.chart_type', 'Gráfico')}
            <select
              aria-label={t('report_builder.editor.chart_type', 'Gráfico')}
              className={inputCls}
              value={draft.chartType}
              onChange={(e) => set({ chartType: e.target.value as ReportChartType })} // ponytail: folha string → união
            >
              {allowedChartTypes(draft.kind).map((c) => (
                <option key={c} value={c}>
                  {t(`report_builder.chart_type.${c}`, c)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Fonte (item 3) */}
      <section className={sectionCls}>
        <h3 className={titleCls}>{t('report_builder.editor.source', 'Fonte')}</h3>
        <select
          aria-label={t('report_builder.editor.source', 'Fonte')}
          className={inputCls}
          value={draft.source ?? ''}
          onChange={(e) => e.target.value && onSourceChange(e.target.value as ReportSource)} // ponytail: folha string → união
        >
          <option value="">{t('report_builder.editor.pick_source', 'Escolha a fonte…')}</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {t(`report_builder.sources.${s}`, s)}
            </option>
          ))}
        </select>
      </section>

      {draft.source && fields ? (
        <>
          {/* Medidas (item 5) */}
          <section className={sectionCls}>
            <h3 className={titleCls}>{t('report_builder.editor.measures', 'Medidas')}</h3>
            <div className="flex flex-col gap-2">
              {draft.measures.map((m, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2" data-testid={`measure-${i}`}>
                  <select
                    aria-label={t('report_builder.editor.measure_type', 'Cálculo')}
                    className={inputCls}
                    value={m.type}
                    onChange={(e) => {
                      const type = e.target.value as MeasureType; // ponytail: folha string → união
                      const keep = measureFieldOptions(type, list).some((f) => f.name === m.field);
                      setMeasure(i, { ...m, type, field: keep ? m.field : '' });
                    }}
                  >
                    {MEASURE_TYPES.map((x) => (
                      <option key={x} value={x}>
                        {t(`report_builder.measure_type.${x}`, x)}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={t('report_builder.editor.measure_field', 'Campo')}
                    className={inputCls}
                    value={m.field}
                    onChange={(e) => setMeasure(i, { ...m, field: e.target.value })}
                  >
                    <option value="">
                      {m.type === 'count'
                        ? t('report_builder.editor.all_rows', 'Todas as linhas')
                        : t('report_builder.editor.pick_field', 'Escolha o campo…')}
                    </option>
                    {measureFieldOptions(m.type, list).map((f) => (
                      <option key={f.name} value={f.name}>
                        {fieldOptionLabel(f)}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={t('report_builder.editor.alias', 'Apelido (opcional)')}
                    placeholder={t('report_builder.editor.alias', 'Apelido (opcional)')}
                    className={inputCls}
                    maxLength={40}
                    value={m.alias}
                    onChange={(e) => setMeasure(i, { ...m, alias: e.target.value })}
                  />
                  {draft.measures.length > 1 ? (
                    <button
                      type="button"
                      className={smallBtn}
                      onClick={() => {
                        const measures = draft.measures.filter((_, j) => j !== i);
                        const idx = draft.sort?.measureIndex;
                        const sort =
                          draft.sort && idx != null ? { ...draft.sort, measureIndex: idx === i ? null : idx > i ? idx - 1 : idx } : draft.sort;
                        set({ measures, sort });
                      }}
                    >
                      {t('report_builder.editor.remove', 'Remover')}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {draft.measures.length < MAX_MEASURES ? (
              <button
                type="button"
                className={`${smallBtn} mt-3`}
                onClick={() => set({ measures: [...draft.measures, { type: 'count', field: '', alias: '' }] })}
              >
                {t('report_builder.editor.add_measure', 'Adicionar medida')}
              </button>
            ) : null}
          </section>

          {/* Regra de moeda guiada (item 8) */}
          {requirements
            .filter((r) => !r.satisfied)
            .map((r) => {
              const pair = byName(r.pairField);
              const currencies = selectOptions(pair).map((o) => o.value);
              const codes = currencies.length > 0 ? currencies : CURRENCY_FALLBACK;
              return (
                <section
                  key={`cur-${r.measureIndex}`}
                  role="alert"
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/30"
                >
                  <p className="mb-2 font-semibold text-amber-800 dark:text-amber-200">
                    {t('report_builder.currency.mixed', {
                      defaultValue: 'O valor de "{{field}}" pode estar em moedas diferentes. Separe por moeda ou escolha uma moeda só.',
                      field: fieldLabel(byName(r.field) ?? { name: r.field, type: 'number' }),
                    })}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={smallBtn}
                      disabled={draft.dimensions.length >= MAX_DIMENSIONS}
                      onClick={() => set({ dimensions: [...draft.dimensions, { type: 'field', field: r.pairField }] })}
                    >
                      {t('report_builder.currency.split', 'Separar por moeda')}
                    </button>
                    <select
                      aria-label={t('report_builder.currency.single', 'Só uma moeda')}
                      className={inputCls}
                      value=""
                      disabled={draft.filters.length >= MAX_FILTERS}
                      onChange={(e) =>
                        e.target.value &&
                        set({ filters: [...draft.filters, { field: r.pairField, op: 'eq', value: e.target.value }] })
                      }
                    >
                      <option value="">{t('report_builder.currency.single', 'Só uma moeda')}…</option>
                      {codes.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>
              );
            })}

          {/* Dimensões (item 6) — KPI não tem dimensão, salvo a de moeda (F-FRB6) */}
          {isKpi ? (
            draft.dimensions.length > 0 ? (
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {t('report_builder.editor.kpi_by_currency', 'KPI separado por moeda: um card por moeda.')}
              </p>
            ) : null
          ) : (
            <section className={sectionCls}>
              <h3 className={titleCls}>{t('report_builder.editor.dimensions', 'Agrupar por')}</h3>
              <div className="flex flex-col gap-2">
                {draft.dimensions.map((d, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2" data-testid={`dimension-${i}`}>
                    <select
                      aria-label={t('report_builder.editor.dimension_type', 'Agrupar')}
                      className={inputCls}
                      value={d.type}
                      onChange={(e) =>
                        setDimension(
                          i,
                          e.target.value === 'period'
                            ? { type: 'period', dateField: periodFieldOptions(list)[0]?.name ?? '', period: 'month' }
                            : { type: 'field', field: list[0]?.name ?? '' },
                        )
                      }
                    >
                      <option value="field">{t('report_builder.editor.by_field', 'Por campo')}</option>
                      <option value="period">{t('report_builder.editor.by_period', 'Por período')}</option>
                    </select>
                    {d.type === 'field' ? (
                      <select
                        aria-label={t('report_builder.editor.dimension_field', 'Campo do agrupamento')}
                        className={inputCls}
                        value={d.field}
                        onChange={(e) => setDimension(i, { type: 'field', field: e.target.value })}
                      >
                        {list.map((f) => (
                          <option key={f.name} value={f.name}>
                            {fieldLabel(f)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <>
                        <select
                          aria-label={t('report_builder.editor.date_field', 'Campo de data')}
                          className={inputCls}
                          value={d.dateField}
                          onChange={(e) => setDimension(i, { ...d, dateField: e.target.value })}
                        >
                          {periodFieldOptions(list).map((f) => (
                            <option key={f.name} value={f.name}>
                              {fieldLabel(f)}
                            </option>
                          ))}
                        </select>
                        <select
                          aria-label={t('report_builder.editor.period', 'Período')}
                          className={inputCls}
                          value={d.period}
                          onChange={(e) => setDimension(i, { ...d, period: e.target.value as PeriodUnit })} // ponytail: folha string → união
                        >
                          {PERIODS.map((p) => (
                            <option key={p} value={p}>
                              {t(`report_builder.period.${p}`, p)}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    <button
                      type="button"
                      className={smallBtn}
                      onClick={() => {
                        const dimensions = draft.dimensions.filter((_, j) => j !== i);
                        set({ dimensions, sort: draft.sort?.by === 'dimension' && dimensions.length === 0 ? null : draft.sort });
                      }}
                    >
                      {t('report_builder.editor.remove', 'Remover')}
                    </button>
                  </div>
                ))}
              </div>
              {draft.dimensions.length < MAX_DIMENSIONS ? (
                <button
                  type="button"
                  className={`${smallBtn} mt-3`}
                  onClick={() => set({ dimensions: [...draft.dimensions, { type: 'field', field: list[0]?.name ?? '' }] })}
                >
                  {t('report_builder.editor.add_dimension', 'Adicionar agrupamento')}
                </button>
              ) : null}
            </section>
          )}

          {/* Filtros (item 7) */}
          <section className={sectionCls}>
            <h3 className={titleCls}>{t('report_builder.editor.filters', 'Filtros')}</h3>
            <div className="flex flex-col gap-2">
              {draft.filters.map((f, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2" data-testid={`filter-${i}`}>
                  <select
                    aria-label={t('report_builder.editor.filter_field', 'Campo do filtro')}
                    className={inputCls}
                    value={f.field}
                    onChange={(e) => setFilter(i, { field: e.target.value, op: f.op, value: isMultiValueOp(f.op) ? [] : '' })}
                  >
                    <option value="">{t('report_builder.editor.pick_field', 'Escolha o campo…')}</option>
                    {list.map((x) => (
                      <option key={x.name} value={x.name}>
                        {fieldLabel(x)}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={t('report_builder.editor.filter_op', 'Operador')}
                    className={inputCls}
                    value={f.op}
                    onChange={(e) => {
                      const op = e.target.value as FilterOp; // ponytail: folha string → união
                      const value = isMultiValueOp(op) === isMultiValueOp(f.op) ? f.value : isMultiValueOp(op) ? [] : '';
                      setFilter(i, { ...f, op, value });
                    }}
                  >
                    {FILTER_OPS.map((op) => (
                      <option key={op} value={op}>
                        {t(`report_builder.op.${op}`, op)}
                      </option>
                    ))}
                  </select>
                  <FilterValueInput filter={f} field={byName(f.field)} onChange={(value) => setFilter(i, { ...f, value })} />
                  <button type="button" className={smallBtn} onClick={() => set({ filters: draft.filters.filter((_, j) => j !== i) })}>
                    {t('report_builder.editor.remove', 'Remover')}
                  </button>
                </div>
              ))}
            </div>
            {draft.filters.length < MAX_FILTERS ? (
              <button
                type="button"
                className={`${smallBtn} mt-3`}
                onClick={() => set({ filters: [...draft.filters, { field: '', op: 'eq', value: '' }] })}
              >
                {t('report_builder.editor.add_filter', 'Adicionar filtro')}
              </button>
            ) : null}
          </section>

          {/* Ordenação e limite (item 9) + conversão (item 11) */}
          <section className={sectionCls}>
            <h3 className={titleCls}>{t('report_builder.editor.sort_limit', 'Ordenação e limite')}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label={t('report_builder.editor.sort_by', 'Ordenar')}
                className={inputCls}
                value={draft.sort?.by ?? ''}
                onChange={(e) => {
                  const by = e.target.value;
                  if (by === 'dimension' || by === 'measure') {
                    set({ sort: { by, dir: draft.sort?.dir ?? 'asc', measureIndex: by === 'measure' && draft.measures.length === 1 ? 0 : null } });
                  } else set({ sort: null });
                }}
              >
                <option value="">{t('report_builder.editor.sort_none', 'Sem ordenação')}</option>
                {draft.dimensions.length > 0 ? (
                  <option value="dimension">{t('report_builder.editor.sort_dimension', 'Pelo agrupamento')}</option>
                ) : null}
                <option value="measure">{t('report_builder.editor.sort_measure', 'Pela medida')}</option>
              </select>
              {draft.sort?.by === 'measure' && draft.measures.length > 1 ? (
                <select
                  aria-label={t('report_builder.editor.sort_key', 'Qual medida')}
                  className={inputCls}
                  value={draft.sort.measureIndex ?? ''}
                  onChange={(e) =>
                    draft.sort && set({ sort: { ...draft.sort, measureIndex: e.target.value === '' ? null : Number(e.target.value) } })
                  }
                >
                  <option value="">{t('report_builder.editor.sort_key', 'Qual medida')}…</option>
                  {draft.measures.map((m, i) => (
                    <option key={i} value={i}>
                      {measureText(m, list, t)}
                    </option>
                  ))}
                </select>
              ) : null}
              {draft.sort ? (
                <select
                  aria-label={t('report_builder.editor.sort_dir', 'Direção')}
                  className={inputCls}
                  value={draft.sort.dir}
                  onChange={(e) => draft.sort && set({ sort: { ...draft.sort, dir: e.target.value === 'desc' ? 'desc' : 'asc' } })}
                >
                  <option value="asc">{t('report_builder.editor.asc', 'Crescente')}</option>
                  <option value="desc">{t('report_builder.editor.desc', 'Decrescente')}</option>
                </select>
              ) : null}
              <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                {t('report_builder.editor.limit', 'Limite')}
                <input
                  type="number"
                  min={1}
                  max={MAX_LIMIT}
                  className={`${inputCls} w-24`}
                  value={draft.limit ?? ''}
                  onChange={(e) => set({ limit: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={draft.convertTo && canConvert}
                disabled={!canConvert}
                onChange={(e) => set({ convertTo: e.target.checked })}
              />
              {t('report_builder.editor.convert', 'Mostrar também convertido para R$ (PTAX)')}
            </label>
            {!canConvert ? (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('report_builder.editor.convert_unavailable', 'Disponível só com soma ou média de valor que tem moeda.')}
              </p>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}

/** Rótulo de uma medida: apelido, ou "Soma de Valor" / "Contagem". */
export function measureText(m: MeasureDraft, fields: readonly ISchemaField[], t: TFunction<'crm'>): string {
  if (m.alias.trim()) return m.alias.trim();
  const f = fields.find((x) => x.name === m.field);
  if (m.type === 'count' && !f) return t('report_builder.measure_label.count_rows', 'Contagem');
  return t(`report_builder.measure_label.${m.type}`, { defaultValue: '{{field}}', field: f ? fieldLabel(f) : m.field });
}

function FilterValueInput({
  filter,
  field,
  onChange,
}: {
  filter: FilterDraft;
  field: ISchemaField | undefined;
  onChange: (value: unknown) => void;
}) {
  const { t } = useTranslation('crm');
  const multi = isMultiValueOp(filter.op);
  const options = selectOptions(field);
  const label = t('report_builder.editor.filter_value', 'Valor');

  if (options.length > 0) {
    if (multi) {
      const chosen = Array.isArray(filter.value) ? filter.value.map(String) : [];
      return (
        <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
          {options.map((o) => (
            <label key={o.value} className="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={chosen.includes(o.value)}
                onChange={(e) => onChange(e.target.checked ? [...chosen, o.value] : chosen.filter((v) => v !== o.value))}
              />
              {o.label}
            </label>
          ))}
        </div>
      );
    }
    return (
      <select aria-label={label} className={inputCls} value={String(filter.value ?? '')} onChange={(e) => onChange(e.target.value)}>
        <option value="">…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (field?.type === 'boolean') {
    return (
      <select
        aria-label={label}
        className={inputCls}
        value={filter.value === true ? 'true' : filter.value === false ? 'false' : ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : coerceFilterValue(e.target.value, field))}
      >
        <option value="">…</option>
        <option value="true">{t('report_builder.editor.yes', 'Sim')}</option>
        <option value="false">{t('report_builder.editor.no', 'Não')}</option>
      </select>
    );
  }

  if (multi) {
    const text = Array.isArray(filter.value) ? filter.value.map(String).join(', ') : '';
    return (
      <input
        aria-label={label}
        className={inputCls}
        placeholder={t('report_builder.editor.multi_hint', 'Valores separados por vírgula')}
        defaultValue={text}
        onBlur={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
              .map((s) => coerceFilterValue(s, field)),
          )
        }
      />
    );
  }

  const type = field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : field?.type === 'datetime' ? 'datetime-local' : 'text';
  return (
    <input
      aria-label={label}
      type={type}
      className={inputCls}
      value={filter.value == null ? '' : String(filter.value)}
      onChange={(e) => onChange(coerceFilterValue(e.target.value, field))}
    />
  );
}
