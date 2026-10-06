'use client';

import React from 'react';
import { useTranslation } from 'next-i18next';
import { hasValidity } from '@/lib/services/packageAcceptances.service';
import type { ValidityNoticeState } from '../../hooks/sales/useValidityNotice';
import { PackageValidityNotice } from './PackageValidityNotice';

interface PackageValidityPromptProps {
    state: ValidityNoticeState;
    accepted: boolean;
    onAcceptedChange: (accepted: boolean) => void;
    onRetry: () => void;
}

/**
 * Bloco de validade + checkbox do operador (F-FE-PV-3 b / F-FE-PV-6 a). O checkbox só existe quando o pacote tem validade;
 * sem texto carregado (carregando ou erro) não há o que aceitar, e quem usa este bloco trava a ação (`isValidityAcceptable`).
 */
export function PackageValidityPrompt({ state, accepted, onAcceptedChange, onRetry }: PackageValidityPromptProps) {
    const { t } = useTranslation(['finance_view']);

    if (state.status === 'idle') return null;
    if (state.status === 'loading') {
        return (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t('finance_view:sales.validity.loading', 'Carregando a validade do pacote…')}
            </p>
        );
    }
    if (state.status === 'error') {
        return (
            <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
                <span>{t('finance_view:sales.validity.load_error', 'Não foi possível carregar a validade do pacote. Sem ela a venda não pode ser registrada.')}</span>
                <button type="button" onClick={onRetry} className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors">
                    {t('finance_view:sales.validity.retry', 'Tentar de novo')}
                </button>
            </div>
        );
    }
    if (!hasValidity(state.notice)) {
        return (
            <p data-testid="package-without-validity" className="text-base font-semibold text-neutral-700 dark:text-neutral-200">
                {t('finance_view:sales.validity.none', 'Sem validade')}
            </p>
        );
    }
    return (
        <div className="space-y-3">
            <PackageValidityNotice text={state.notice.text} expiresOn={state.notice.expiresOn} />
            <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => onAcceptedChange(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {t('finance_view:sales.validity.accept_label', 'Li este texto ao cliente e ele concordou')}
                </span>
            </label>
        </div>
    );
}

/**
 * O aceite está resolvido? `required` = a venda é de pacote e o pacote já foi escolhido. Sem texto carregado (idle,
 * carregando, erro) trava — não se aceita o que não se viu; pacote sem validade não pede aceite; com validade exige o checkbox.
 */
export function isValidityAcceptable(required: boolean, state: ValidityNoticeState, accepted: boolean): boolean {
    if (!required) return true;
    if (state.status !== 'ready') return false;
    return !hasValidity(state.notice) || accepted;
}
