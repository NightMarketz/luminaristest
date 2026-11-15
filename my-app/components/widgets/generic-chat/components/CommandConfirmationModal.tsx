import React, { useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Modal } from '../../../ui/Modal';

export interface CommandConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    proposal: {
        id: string;
        action: 'CREATE' | 'UPDATE' | 'DELETE';
        tableName: string;
        tableLabel: string;
        data: Record<string, unknown>;
    };
}

const THEME_COLOR: Record<string, string> = {
    CREATE: 'bg-emerald-500',
    UPDATE: 'bg-blue-500',
    DELETE: 'bg-rose-500',
};

/** Confirmação de escrita proposta pela IA — sobre o Modal compartilhado (Esc, trap de foco, aria-labelledby). */
export function CommandConfirmationModal({ isOpen, onClose, onConfirm, proposal }: CommandConfirmationModalProps) {
    const { t } = useTranslation('common');
    const [pending, setPending] = useState(false);
    const lockRef = useRef(false);

    const titles: Record<string, string> = {
        CREATE: t('chat.confirm.title_create', 'Confirmar Novo Registro'),
        UPDATE: t('chat.confirm.title_update', 'Confirmar Alterações'),
        DELETE: t('chat.confirm.title_delete', 'Confirmar Exclusão'),
    };

    const handleConfirm = async () => {
        if (lockRef.current) return;
        lockRef.current = true;
        setPending(true);
        try {
            await onConfirm();
        } finally {
            lockRef.current = false;
            setPending(false);
        }
    };

    const footer = (
        <>
            <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="px-6 py-2.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-xl text-sm font-bold disabled:opacity-50"
            >
                {t('chat.confirm.review_again', 'Revisar Novamente')}
            </button>
            <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/25 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {pending ? t('chat.confirm.applying', 'Aplicando...') : t('chat.confirm.confirm_apply', 'Confirmar e Aplicar')}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={titles[proposal.action] ?? t('chat.confirm.title_default', 'Confirmar Ação')}
            subtitle={`${t('chat.confirm.selected_table', 'Tabela Selecionada')}: ${proposal.tableLabel}`}
            maxWidth="max-w-xl"
            themeColor={THEME_COLOR[proposal.action] ?? 'bg-indigo-500'}
            footer={footer}
        >
            <div className="px-6 py-6 space-y-6">
                <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800">
                    <h4 className="text-sm font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4">
                        {t('chat.confirm.operation_data', 'Dados da Operação')}
                    </h4>
                    <dl className="grid gap-y-4">
                        {Object.entries(proposal.data).map(([key, value]) => (
                            <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 pb-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0 last:pb-0">
                                <dt className="text-neutral-500 dark:text-neutral-400 text-sm font-medium sm:w-1/3 shrink-0 capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                </dt>
                                <dd className="text-neutral-900 dark:text-neutral-100 text-sm font-semibold break-words sm:w-2/3">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <div role="note" className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4">
                    <h5 className="text-amber-800 dark:text-amber-400 font-bold text-sm">{t('chat.confirm.warning_title', 'Atenção')}</h5>
                    <p className="text-amber-700/80 dark:text-amber-500/70 text-xs leading-relaxed mt-0.5">
                        {t('chat.confirm.warning_body', 'Esta ação alterará registros reais no banco de dados. Verifique cuidadosamente os campos acima antes de prosseguir com a execução.')}
                    </p>
                </div>
            </div>
        </Modal>
    );
}
