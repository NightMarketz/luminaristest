'use client';

import React from 'react';
import { useTranslation } from 'next-i18next';
import { formatDateBR } from '@/features/dashboard/shared/utils/formatters';

interface PackageValidityNoticeProps {
    /** Texto legal LITERAL (vem do servidor — nunca recomposto aqui; o que se grava é o hash dele). */
    text: string;
    /** `YYYY-MM-DD` */
    expiresOn: string;
}

/**
 * Validade do pacote em destaque (F-JUR-4; CDC art. 54 § 3º e § 4º): caixa com borda, texto em `text-base` (16px = 12pt,
 * BRIEF F14) e `font-semibold`. Mesmo bloco na venda (pedindo o aceite) e no detalhe (mostrando o que foi aceito).
 * A frase em `text-lg` repete só a data; o texto legal vem inteiro logo abaixo.
 */
export function PackageValidityNotice({ text, expiresOn }: PackageValidityNoticeProps) {
    const { t } = useTranslation(['finance_view']);
    return (
        <div
            role="note"
            data-testid="package-validity-notice"
            className="rounded-2xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-400 p-4"
        >
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
                {t('finance_view:sales.validity.until', 'Válido até {{date}}', { date: formatDateBR(expiresOn) })}
            </p>
            <p data-testid="package-validity-text" className="mt-2 text-base font-semibold leading-relaxed text-neutral-900 dark:text-neutral-50">
                {text}
            </p>
        </div>
    );
}
