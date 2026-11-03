import React from 'react';
import type { ActivateDefaultBindingResultInput } from '../../../lib/services/accountingBinding.service';
import { useAccountingT } from '../lib/useAccountingT';

export type ActivationBlockingIssue = NonNullable<ActivateDefaultBindingResultInput['blocking']>[number];

export interface ActivationBlockingListProps {
  blocking: ActivationBlockingIssue[];
  /** Link "Ir para Períodos" no bloqueante de período; sem a prop, o link não renderiza. */
  onNavigateToPeriods?: () => void;
}

/** Rótulo i18n dos códigos de pré-condição conhecidos (LAC-B item 6); os demais mostram a `message` do BE. */
const KNOWN_BLOCKING: Record<string, { key: string; fallback: string }> = {
  CHART_OF_ACCOUNTS_EMPTY: { key: 'activation.blocking.CHART_OF_ACCOUNTS_EMPTY', fallback: 'O plano de contas da unidade está vazio.' },
  ACCOUNTING_PERIOD_NOT_OPEN: {
    key: 'activation.blocking.ACCOUNTING_PERIOD_NOT_OPEN',
    fallback: 'O período {{period}} está fechado — reabra-o antes de ativar.',
  },
  EVENT_COVERAGE_MISSING: {
    key: 'activation.blocking.EVENT_COVERAGE_MISSING',
    fallback: 'Há evento da operação sem regra contábil.',
  },
};

/**
 * Lista de bloqueantes de um `activate-default` que voltou `Draft`. Extraída da faixa de ativação (LAC-B) para a aba
 * "Kit de setor" reusar na retomada da instalação (EMENDA-2 item 8: "reusar o render dos bloqueantes — extrair do
 * banner, não copiar").
 */
export function ActivationBlockingList({ blocking, onNavigateToPeriods }: ActivationBlockingListProps) {
  const { t } = useAccountingT();
  if (blocking.length === 0) return null;

  const blockingLabel = (issue: ActivationBlockingIssue) => {
    const known = KNOWN_BLOCKING[issue.code];
    return known ? t(known.key, known.fallback, { period: issue.period ?? '' }) : issue.message;
  };

  return (
    <div data-testid="accounting-activation-blocking" className="rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-neutral-200">
      <p className="mb-1 text-xs font-semibold text-neutral-400">{t('activation.blockingTitle', 'A ativação não foi concluída:')}</p>
      <ul className="space-y-1">
        {blocking.map((issue, i) => (
          <li key={`${issue.code}-${i}`} className="flex flex-wrap items-center gap-2">
            <span>{blockingLabel(issue)}</span>
            {issue.code === 'ACCOUNTING_PERIOD_NOT_OPEN' && onNavigateToPeriods && (
              <button type="button" onClick={onNavigateToPeriods} className="text-xs font-semibold text-emerald-400 underline hover:text-emerald-300">
                {t('activation.goToPeriods', 'Ir para Períodos')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
