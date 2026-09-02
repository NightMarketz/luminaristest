'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Modal } from '@/components/ui/Modal';
import { useFormatCurrency } from '@/lib/context/CurrencyContext';
import { SALE_PAYMENT_METHODS, type SalePaymentMethod } from '@/lib/services/sales.service';
import { packageBalancesService, type CustomerPackageBalance } from '@/lib/services/packageBalances.service';
import type { SaleRecord } from '../../types/sales.types';

/**
 * Modais das transições dedicadas da venda (FE-INCR-SALE-ACTIONS / LAC-A):
 *  - SalePaymentModal: o DTO do settlement exige paymentMethod (a tela antiga nem perguntava);
 *    'Package Balance' exige packageId — LAC-C entra aqui (saldo via GET /package-balances,
 *    opção desabilitada com tooltip quando não há pacote com saldo, F-A3(b) ratificado).
 *  - SaleReasonModal: cancelamento/devolução com motivo OPCIONAL (F-A4(a) ratificado).
 * O hard-gate de suficiência de pacote continua no servidor — o disable aqui é UX, não autoridade.
 */

// ── Pagamento ────────────────────────────────────────────────────────────────

interface SalePaymentModalProps {
    sale: SaleRecord | null;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (payment: {
        paymentMethod: SalePaymentMethod;
        paymentReference?: string;
        packageId?: string;
    }) => Promise<void>;
}

export function SalePaymentModal({ sale, isOpen, onClose, onConfirm }: SalePaymentModalProps) {
    const { t } = useTranslation(['finance_view', 'common']);
    const formatCurrency = useFormatCurrency();
    const [method, setMethod] = useState<SalePaymentMethod | ''>('');
    const [reference, setReference] = useState('');
    const [packageId, setPackageId] = useState('');
    const [balances, setBalances] = useState<CustomerPackageBalance[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const unitId = String(sale?.unitId || '');
    const customerId = String(sale?.customerId || '');
    const totalCents = Math.round((Number(sale?.totalAmount) || 0) * 100);

    useEffect(() => {
        if (!isOpen) {
            setMethod('');
            setReference('');
            setPackageId('');
            setBalances([]);
            return;
        }
        if (!unitId || !customerId) return;
        let alive = true;
        packageBalancesService
            .listBalances(unitId, customerId)
            .then((rows) => { if (alive) setBalances(rows.filter((b) => b.balanceCents > 0)); })
            .catch(() => { /* erro notificado pelo apiClient; sem pacote é estado válido */ });
        return () => { alive = false; };
    }, [isOpen, unitId, customerId]);

    const hasPackages = balances.length > 0;
    const selectedBalance = useMemo(
        () => balances.find((b) => b.packageId === packageId) ?? null,
        [balances, packageId],
    );

    const isPackage = method === 'Package Balance';
    const packageInsufficient = isPackage && selectedBalance != null && selectedBalance.balanceCents < totalCents;
    const isValid =
        method !== '' && (!isPackage || (packageId !== '' && selectedBalance != null && !packageInsufficient));

    const methodLabel = (m: SalePaymentMethod) =>
        t(`finance_view:sales.payment.methods.${m.replace(/\s/g, '_').toLowerCase()}`, m);

    const handleConfirm = async () => {
        if (!isValid || submitting) return;
        setSubmitting(true);
        try {
            await onConfirm({
                paymentMethod: method as SalePaymentMethod,
                ...(reference.trim() ? { paymentReference: reference.trim() } : {}),
                ...(isPackage ? { packageId } : {}),
            });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('finance_view:sales.payment.title', 'Registrar pagamento')}
            themeColor="bg-blue-600"
            footer={
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        {t('common:cancel', 'Cancelar')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isValid || submitting}
                        className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {t('finance_view:sales.payment.confirm', 'Confirmar pagamento')}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('finance_view:sales.payment.total', 'Total da venda')}:{' '}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(totalCents / 100)}
                    </span>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {t('finance_view:sales.payment.method', 'Forma de pagamento')} *
                    </label>
                    <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value as SalePaymentMethod | '')}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    >
                        <option value="">{t('finance_view:sales.payment.method_placeholder', 'Selecione…')}</option>
                        {SALE_PAYMENT_METHODS.map((m) => (
                            <option
                                key={m}
                                value={m}
                                disabled={m === 'Package Balance' && !hasPackages}
                                title={
                                    m === 'Package Balance' && !hasPackages
                                        ? t('finance_view:sales.payment.no_packages', 'Cliente sem pacote com saldo.')
                                        : undefined
                                }
                            >
                                {methodLabel(m)}
                                {m === 'Package Balance' && !hasPackages
                                    ? ` — ${t('finance_view:sales.payment.no_packages', 'Cliente sem pacote com saldo.')}`
                                    : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {isPackage && (
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            {t('finance_view:sales.payment.package', 'Pacote')} *
                        </label>
                        <select
                            value={packageId}
                            onChange={(e) => setPackageId(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                        >
                            <option value="">{t('finance_view:sales.payment.package_placeholder', 'Selecione o pacote…')}</option>
                            {balances.map((b) => (
                                <option key={b.id} value={b.packageId}>
                                    {t('finance_view:sales.payment.package_option', 'Pacote {{id}} — saldo {{balance}}', {
                                        id: b.packageId.slice(0, 8),
                                        balance: formatCurrency(b.balanceCents / 100),
                                    })}
                                </option>
                            ))}
                        </select>
                        {packageInsufficient && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {t('finance_view:sales.payment.insufficient', 'Saldo do pacote insuficiente para o total da venda.')}
                            </p>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {t('finance_view:sales.payment.reference', 'Referência (opcional)')}
                    </label>
                    <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        maxLength={255}
                        placeholder={t('finance_view:sales.payment.reference_placeholder', 'NSU, código Pix…')}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    />
                </div>
            </div>
        </Modal>
    );
}

// ── Cancelar / Devolver (motivo opcional) ────────────────────────────────────

interface SaleReasonModalProps {
    isOpen: boolean;
    kind: 'cancel' | 'return';
    onClose: () => void;
    onConfirm: (reason?: string) => Promise<void>;
}

export function SaleReasonModal({ isOpen, kind, onClose, onConfirm }: SaleReasonModalProps) {
    const { t } = useTranslation(['finance_view', 'common']);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) setReason('');
    }, [isOpen]);

    const isCancel = kind === 'cancel';
    const title = isCancel
        ? t('finance_view:sales.confirm_cancel', 'Cancelar venda?')
        : t('finance_view:sales.confirm_return', 'Devolver venda?');
    const message = isCancel
        ? t('finance_view:sales.confirm_cancel_message', 'Esta ação não pode ser desfeita. A venda será marcada como cancelada.')
        : t('finance_view:sales.confirm_return_message', 'A devolução registra a contra-receita; o lançamento original não é alterado.');

    const handleConfirm = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            await onConfirm(reason.trim() || undefined);
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            themeColor={isCancel ? 'bg-red-600' : 'bg-amber-600'}
            footer={
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        {t('common:back', 'Voltar')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={submitting}
                        className={`px-3 py-1.5 text-sm rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isCancel ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                    >
                        {isCancel
                            ? t('common:cancel', 'Cancelar venda')
                            : t('finance_view:sales.return_confirm', 'Confirmar devolução')}
                    </button>
                </div>
            }
        >
            <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
                <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {t('finance_view:sales.reason_label', 'Motivo (opcional)')}
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        maxLength={500}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    />
                </div>
            </div>
        </Modal>
    );
}
