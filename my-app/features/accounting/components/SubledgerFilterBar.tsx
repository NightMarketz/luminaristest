import type { TFunction } from 'i18next';
import { FiSearch, FiX } from 'react-icons/fi';

/**
 * SubledgerFilterBar — shared filter controls for the AP/AR subledger panels
 * (`AccountsPayablePanel`/`AccountsReceivablePanel` — mirror screens, 83%
 * identical; a bespoke 3rd copy of this bar would be the 3rd clone of the same
 * technique). Purely controlled: the panel owns filter state and the fetch —
 * this component only renders inputs and reports the next value via `onChange`.
 * `counterpartyId`/`dueFrom`/`dueTo`/`q` map straight to the backend query
 * params (BE-INCR-SUBLEDGER-FILTERS, PR #190); `overdue` is a boolean toggle —
 * `undefined` when off, `true` when on (never `false` — the caller/service
 * contract omits the param entirely when the filter is disabled).
 */

export interface SubledgerFilterValue {
  counterpartyId?: string;
  dueFrom?: string;
  dueTo?: string;
  q?: string;
  overdue?: boolean;
}

export interface SubledgerCounterpartyOption {
  id: string;
  name: string;
}

interface SubledgerFilterBarProps {
  value: SubledgerFilterValue;
  onChange: (value: SubledgerFilterValue) => void;
  counterpartyOptions: SubledgerCounterpartyOption[];
  t: TFunction;
}

const inputClass =
  'rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none';

const labelClass = 'text-[10px] font-black uppercase tracking-widest text-neutral-500';

export function SubledgerFilterBar({ value, onChange, counterpartyOptions, t }: SubledgerFilterBarProps) {
  const hasActiveFilters =
    !!value.counterpartyId || !!value.dueFrom || !!value.dueTo || !!value.q || !!value.overdue;

  function patch(next: Partial<SubledgerFilterValue>) {
    onChange({ ...value, ...next });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
      {/* Search (description OR document number) */}
      <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
        <label htmlFor="subledger-filter-q" className={labelClass}>
          {t('subledgerFilters.searchLabel', 'Buscar')}
        </label>
        <div className="relative">
          <FiSearch size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            id="subledger-filter-q"
            type="text"
            value={value.q ?? ''}
            onChange={(e) => patch({ q: e.target.value || undefined })}
            placeholder={t('subledgerFilters.searchPlaceholder', 'Descrição ou nº do documento…')}
            title={t(
              'subledgerFilters.searchHint',
              'Não diferencia maiúsculas de minúsculas, mas não casa acentuação (ex.: "marco" não encontra "março").',
            )}
            className={`${inputClass} w-full pl-8`}
          />
        </div>
      </div>

      {/* Counterparty */}
      <div className="flex min-w-[160px] flex-col gap-1.5">
        <label htmlFor="subledger-filter-counterparty" className={labelClass}>
          {t('subledgerFilters.counterpartyLabel', 'Contraparte')}
        </label>
        <select
          id="subledger-filter-counterparty"
          value={value.counterpartyId ?? ''}
          onChange={(e) => patch({ counterpartyId: e.target.value || undefined })}
          className={inputClass}
        >
          <option value="">{t('subledgerFilters.counterpartyAll', '— todas —')}</option>
          {counterpartyOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Due date range */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="subledger-filter-due-from" className={labelClass}>
          {t('subledgerFilters.dueFromLabel', 'Vencimento de')}
        </label>
        <input
          id="subledger-filter-due-from"
          type="date"
          value={value.dueFrom ?? ''}
          onChange={(e) => patch({ dueFrom: e.target.value || undefined })}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="subledger-filter-due-to" className={labelClass}>
          {t('subledgerFilters.dueToLabel', 'Vencimento até')}
        </label>
        <input
          id="subledger-filter-due-to"
          type="date"
          value={value.dueTo ?? ''}
          onChange={(e) => patch({ dueTo: e.target.value || undefined })}
          className={inputClass}
        />
      </div>

      {/* Overdue toggle */}
      <label className="flex items-center gap-2 pb-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          checked={!!value.overdue}
          onChange={(e) => patch({ overdue: e.target.checked || undefined })}
          className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-emerald-600 focus:ring-emerald-500"
        />
        {t('subledgerFilters.overdueLabel', 'Só vencidos')}
      </label>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="mb-0.5 inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs font-medium text-neutral-300 transition-colors hover:border-red-700 hover:bg-red-900/30 hover:text-red-300"
        >
          <FiX size={12} />
          {t('subledgerFilters.clear', 'Limpar filtros')}
        </button>
      )}
    </div>
  );
}
