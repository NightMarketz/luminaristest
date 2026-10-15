import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import type { FiscalOnboarding, RegimeOnboarding } from '../../hooks/useAiInterview';

/**
 * X13 PR-3 item 20 (F-OBP-6 → c): pergunta FECHADA de regime e porte ao fim da entrevista — o onboarding pergunta só
 * isso; o resto do perfil fiscal (livro, signatários, CSLL) vem depois, no formulário. "Não sei" é resposta válida:
 * nada é criado e o contador informa depois. O modelo da entrevista nunca infere o regime.
 *
 * I4 PR-4 (EMENDA 14/10, F-I4-7 a): em `PRESUMIDO`/`REAL` uma pergunta fechada a mais — se a empresa vende mercadoria
 * com inscrição estadual (LC 87/96 art. 4º; fato da empresa, não decorre do regime). Vai como `icmsContribuinte`
 * true/false/null; "não sei" (null) não cria o perfil fiscal da unidade e a ativação sai `Draft`. Nos outros regimes o
 * campo não vai — o servidor força `false` no MEI/Simples (f4). Sob F-I4-9 (a) o componente serve os 3 wizards.
 */
const REGIMES: RegimeOnboarding[] = ['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL', 'NAO_SEI'];
const SIM_NAO_NAOSEI: Array<{ key: 'sim' | 'nao' | 'naoSei'; value: boolean | null }> = [
  { key: 'sim', value: true },
  { key: 'nao', value: false },
  { key: 'naoSei', value: null },
];
const PORTES = SIM_NAO_NAOSEI;
const ICMS_OPCOES = SIM_NAO_NAOSEI;
/** Regimes em que `icmsContribuinte` não se deriva e precisa ser perguntado (F-I4-7). */
const REGIMES_COM_PERGUNTA_ICMS: ReadonlySet<RegimeOnboarding> = new Set<RegimeOnboarding>(['PRESUMIDO', 'REAL']);

interface FiscalQuestionProps {
  onConfirm: (fiscal: FiscalOnboarding) => void;
  /** Rápido/Controle Total: trava o botão enquanto o create está em voo. */
  disabled?: boolean;
}

export default function FiscalQuestion({ onConfirm, disabled = false }: FiscalQuestionProps) {
  const { t } = useTranslation('common');
  const [regime, setRegime] = useState<RegimeOnboarding | null>(null);
  const [grandePorte, setGrandePorte] = useState<boolean | null>(null);
  const [icmsContribuinte, setIcmsContribuinte] = useState<boolean | null>(null);
  const perguntaIcms = regime !== null && REGIMES_COM_PERGUNTA_ICMS.has(regime);

  const confirmar = () => {
    if (!regime) return;
    onConfirm(perguntaIcms ? { regime, grandePorte, icmsContribuinte } : { regime, grandePorte });
  };

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

      {perguntaIcms && (
        <fieldset>
          <legend className="mb-3 text-sm font-bold text-neutral-800 dark:text-neutral-200">{t('fiscalIcmsLabel')}</legend>
          <div className="grid grid-cols-3 gap-2">
            {ICMS_OPCOES.map((o) => (
              <label key={o.key} className={optionClass(icmsContribuinte === o.value)}>
                <input
                  type="radio"
                  name="fiscal-icms"
                  value={o.key}
                  checked={icmsContribuinte === o.value}
                  onChange={() => setIcmsContribuinte(o.value)}
                  className="h-4 w-4 text-blue-600"
                />
                <span>{t(`fiscalIcms_${o.key}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <button
        type="button"
        disabled={regime === null || disabled}
        onClick={confirmar}
        className="w-full rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t('fiscalCreateButton')}
      </button>
    </div>
  );
}
