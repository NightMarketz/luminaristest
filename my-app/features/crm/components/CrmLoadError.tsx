import React from 'react';
import { useTranslation } from 'next-i18next';

interface CrmLoadErrorProps {
  message: string;
  onRetry?: () => void;
}

/**
 * Falha de carga no CRM: a mensagem vem como `role="alert"` e, quando há como refazer a busca, com o botão
 * "Tentar novamente". As telas não devem exibir "vazio"/"não instalado"/KPI 0 por baixo dele — o erro não é ausência.
 */
export function CrmLoadError({ message, onRetry }: CrmLoadErrorProps) {
  const { t } = useTranslation('crm');
  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
    >
      <span>{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-black text-rose-700 transition hover:bg-rose-100 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-900/40"
        >
          {t('common.retry', 'Tentar novamente')}
        </button>
      ) : null}
    </div>
  );
}
