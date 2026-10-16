import React from 'react';
import { useTranslation } from 'next-i18next';
import type { InterviewModuleOption, ModuleKey } from '../../types/InterviewTypes';

interface ModuleChecklistProps {
  options: InterviewModuleOption[];
  selected: ModuleKey[];
  disabled: boolean;
  onToggle: (key: ModuleKey) => void;
}

/** W5 item 15: um checkbox por módulo sugerido no turno MATCHING_PRESET, ao lado do `CreationChoice`. */
export default function ModuleChecklist({ options, selected, disabled, onToggle }: ModuleChecklistProps) {
  const { t, i18n } = useTranslation('common');
  const locale: 'pt' | 'en' = i18n?.language?.startsWith('en') ? 'en' : 'pt';

  return (
    <fieldset className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <legend className="px-1 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t('interviewModulesTitle')}</legend>
      <p className="mb-3 text-xs text-neutral-600 dark:text-neutral-400">{t('interviewModulesHint')}</p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <li key={o.key}>
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600"
                checked={selected.includes(o.key)}
                disabled={disabled || o.locked}
                onChange={() => onToggle(o.key)}
              />
              <span>{o.name[locale]}</span>
              {o.locked && <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('interviewModulesIncluded')}</span>}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
