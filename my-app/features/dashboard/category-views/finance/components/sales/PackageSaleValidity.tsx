'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { formatDateBR } from '@/features/dashboard/shared/utils/formatters';
import { packageAcceptancesService, hasValidity, toAcceptanceInput, type PackageAcceptance } from '@/lib/services/packageAcceptances.service';
import { packageBalancesService } from '@/lib/services/packageBalances.service';
import { useValidityNotice } from '../../hooks/sales/useValidityNotice';
import { PackageValidityNotice } from './PackageValidityNotice';
import { PackageValidityPrompt } from './PackageValidityPrompt';

interface PackageSaleValidityProps {
    unitId: string;
    saleId: string;
    packageId: string;
    /** `YYYY-MM-DD` — a data da venda (base do prazo) */
    saleDate: string;
    customerId?: string;
    /** O saldo só é creditado na finalização (F13): antes disso não há `expiresAt` a mostrar. */
    isFinalized: boolean;
}

type AcceptanceState = { status: 'loading' } | { status: 'ready'; acceptance: PackageAcceptance | null } | { status: 'error' };

/**
 * Detalhe da venda de pacote (FE-INCR-PACOTE-VALIDADE itens 12 e 13): a validade em destaque, o aceite (quem, quando,
 * versão do texto) ou o selo "aceite não registrado" com o botão que abre o mesmo bloco da venda, e o PDF do comprovante.
 * Com aceite, o texto exibido é o GRAVADO (`textShown`), não um re-render de hoje.
 */
export function PackageSaleValidity({ unitId, saleId, packageId, saleDate, customerId, isFinalized }: PackageSaleValidityProps) {
    const { t } = useTranslation(['finance_view', 'common']);
    const [acceptanceState, setAcceptanceState] = useState<AcceptanceState>({ status: 'loading' });
    const [reloadKey, setReloadKey] = useState(0);
    const [balanceExpiresOn, setBalanceExpiresOn] = useState<string | null>(null);
    const [registering, setRegistering] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let alive = true;
        setAcceptanceState({ status: 'loading' });
        packageAcceptancesService
            .getBySale(unitId, saleId)
            .then((acceptance) => { if (alive) setAcceptanceState({ status: 'ready', acceptance }); })
            .catch(() => { if (alive) setAcceptanceState({ status: 'error' }); }); // erro notificado pelo apiClient
        return () => { alive = false; };
    }, [unitId, saleId, reloadKey]);

    // F13/I4: o saldo creditado carrega a validade do crédito (a recompra a junta); mostrada ao lado quando difere da da venda.
    useEffect(() => {
        setBalanceExpiresOn(null);
        if (!isFinalized || !customerId) return;
        let alive = true;
        packageBalancesService
            .listBalances(unitId, customerId)
            .then((rows) => { if (alive) setBalanceExpiresOn(rows.find((b) => b.packageId === packageId)?.expiresOn ?? null); })
            .catch(() => { /* só informativo */ });
        return () => { alive = false; };
    }, [unitId, customerId, packageId, isFinalized, reloadKey]);

    const needsNotice = acceptanceState.status === 'ready' && acceptanceState.acceptance === null;
    // Sem aceite, o texto vem do servidor agora (mesmo `notice` da venda). Com aceite, nada a buscar.
    const { state: noticeState, reload: reloadNotice } = useValidityNotice(
        needsNotice ? unitId : undefined,
        packageId,
        saleDate,
    );

    const handleRegister = useCallback(async () => {
        if (noticeState.status !== 'ready' || !hasValidity(noticeState.notice)) return;
        setSaving(true);
        try {
            await packageAcceptancesService.create(toAcceptanceInput(unitId, saleId, noticeState.notice));
            setRegistering(false);
            setAccepted(false);
            setReloadKey((n) => n + 1);
        } catch {
            // erro notificado pelo apiClient (409 PACKAGE_NOTICE_CHANGED: o texto mudou — refaz a busca e pede de novo)
            setAccepted(false);
            reloadNotice();
        } finally {
            setSaving(false);
        }
    }, [noticeState, unitId, saleId, reloadNotice]);

    const handleDownload = useCallback(() => {
        packageAcceptancesService.downloadReceipt(unitId, saleId).catch(() => { /* erro já tratado/notificado */ });
    }, [unitId, saleId]);

    const acceptance = acceptanceState.status === 'ready' ? acceptanceState.acceptance : null;
    // Pacote sem validade: não há texto a aceitar nem comprovante a emitir (o servidor responde 400 PACKAGE_WITHOUT_VALIDITY).
    const noValidity = needsNotice && noticeState.status === 'ready' && !hasValidity(noticeState.notice);
    const expiresOn = acceptance
        ? acceptance.expiresOn
        : noticeState.status === 'ready' && hasValidity(noticeState.notice) ? noticeState.notice.expiresOn : null;

    return (
        <section data-testid="package-sale-validity" className="space-y-3 rounded-2xl border border-gray-200/70 dark:border-gray-800/70 p-4">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {t('finance_view:sales.validity.title', 'Validade do pacote')}
                </h3>
                {!noValidity && (
                <button
                    type="button"
                    onClick={handleDownload}
                    className="text-xs px-2 py-1 rounded bg-neutral-800 text-white hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 transition-colors"
                >
                    {t('finance_view:sales.validity.download_receipt', 'Baixar comprovante (PDF)')}
                </button>
                )}
            </div>

            {acceptanceState.status === 'loading' && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('finance_view:sales.validity.loading', 'Carregando a validade do pacote…')}</p>
            )}
            {acceptanceState.status === 'error' && (
                <p className="text-sm text-red-600 dark:text-red-400">{t('finance_view:sales.validity.load_error_detail', 'Não foi possível carregar o aceite desta venda.')}</p>
            )}

            {acceptance && (
                <>
                    <PackageValidityNotice text={acceptance.textShown} expiresOn={acceptance.expiresOn} />
                    <p data-testid="package-acceptance-record" className="text-xs text-neutral-600 dark:text-neutral-400">
                        {t('finance_view:sales.validity.accepted_by', 'Aceite registrado por {{who}} em {{when}} (texto {{version}})', {
                            who: acceptance.acceptedByUserId,
                            when: new Date(acceptance.acceptedAt).toLocaleString('pt-BR'),
                            version: acceptance.textVersion,
                        })}
                    </p>
                </>
            )}

            {needsNotice && (
                noticeState.status === 'ready' && hasValidity(noticeState.notice) ? (
                    <>
                        <PackageValidityNotice text={noticeState.notice.text} expiresOn={noticeState.notice.expiresOn} />
                        <span
                            data-testid="package-acceptance-missing"
                            className="inline-block rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-1 text-xs font-bold uppercase tracking-wide"
                        >
                            {t('finance_view:sales.validity.not_registered', 'Aceite não registrado')}
                        </span>
                        {!registering ? (
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setRegistering(true)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                                >
                                    {t('finance_view:sales.validity.register', 'Registrar aceite')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={accepted}
                                        onChange={(e) => setAccepted(e.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                        {t('finance_view:sales.validity.accept_label', 'Li este texto ao cliente e ele concordou')}
                                    </span>
                                </label>
                                <button
                                    type="button"
                                    disabled={saving || !accepted}
                                    onClick={handleRegister}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {t('finance_view:sales.validity.confirm_register', 'Confirmar aceite')}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    // carregando, erro (com "tentar de novo") ou pacote sem validade — o mesmo bloco da venda cuida dos três
                    <PackageValidityPrompt state={noticeState} accepted={false} onAcceptedChange={() => {}} onRetry={reloadNotice} />
                )
            )}

            {isFinalized && balanceExpiresOn && expiresOn && balanceExpiresOn !== expiresOn && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {t('finance_view:sales.validity.balance_differs', 'O saldo do cliente neste pacote vence em {{date}} (junta compras anteriores).', { date: formatDateBR(balanceExpiresOn) })}
                </p>
            )}
            {isFinalized && balanceExpiresOn && !expiresOn && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {t('finance_view:sales.validity.balance_expires', 'O saldo do cliente neste pacote vence em {{date}}.', { date: formatDateBR(balanceExpiresOn) })}
                </p>
            )}
        </section>
    );
}
