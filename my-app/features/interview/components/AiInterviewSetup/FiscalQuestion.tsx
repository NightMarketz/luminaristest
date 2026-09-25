import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { FiscalOnboarding, RegimeOnboarding } from '../../hooks/useAiInterview';

/**
 * X13 PR-3 item 20 (F-OBP-6 → c): pergunta FECHADA de regime e porte ao fim da entrevista — o onboarding pergunta só
 * isso; o resto do perfil fiscal (livro, signatários, CSLL) vem depois, no formulário. "Não sei" é resposta válida:
 * nada é criado e o contador informa depois. O modelo da entrevista nunca infere o regime.
 */
const REGIMES: RegimeOnboarding[] = ['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL', 'NAO_SEI'];
const PORTES: Array<{ key: 'sim' | 'nao' | 'naoSei'; value: boolean | null }> = [
  { key: 'sim', value: true },
  { key: 'nao', value: false },
  { key: 'naoSei', value: null },
];

interface FiscalQuestionProps {
  onConfirm: (fiscal: FiscalOnboarding) => void;
}

export default function FiscalQuestion({ onConfirm }: FiscalQuestionProps) {
  const { t } = useTranslation('common');
  const [regime, setRegime] = useState<RegimeOnboarding | null>(null);
  const [grandePorte, setGrandePorte] = useState<boolean | null>(null);

  const optionClass = (checked: boolean) =>
    `flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm transition-colors ${
      checked
        ? 'border-blue-500 bg-blue-50/50 text-neutral-900 dark:bg-blue-900/10 dark:text-white'
        : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
    }`;

  return (
    <div className="mt-4 space-y-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-900">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('fiscalQuestionIntro')}</p>

      <fieldset>
        <legend className="mb-3 text-sm font-bold text-neutral-800 dark:text-neutral-200">{t('fiscalRegimeLabel')}</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {REGIMES.map((r) => (
            <label key={r} className={optionClass(regime === r)}>
              <input type="radio" name="fiscal-regime" value={r} checked={regime === r} onChange={() => setRegime(r)} className="h-4 w-4 text-blue-600" />
              <span>{t(`fiscalRegime_${r}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-bold text-neutral-800 dark:text-neutral-200">{t('fiscalPorteLabel')}</legend>
        <div className="grid grid-cols-3 gap-2">
          {PORTES.map((p) => (
            <label key={p.key} className={optionClass(grandePorte === p.value)}>
              <input
                type="radio"
                name="fiscal-porte"
                value={p.key}
                checked={grandePorte === p.value}
                onChange={() => setGrandePorte(p.value)}
                className="h-4 w-4 text-blue-600"
              />
              <span>{t(`fiscalPorte_${p.key}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={regime === null}
        onClick={() => regime && onConfirm({ regime, grandePorte })}
        className="w-full rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t('fiscalCreateButton')}
      </button>
    </div>
  );
}
