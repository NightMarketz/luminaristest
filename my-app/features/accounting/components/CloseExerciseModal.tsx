import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Modal } from '../../../components/ui/Modal';
import { accountingService, type JournalEntry } from '../../../lib/services/accounting.service';
import { resolveErrorWithCode } from '../lib/resolveError';

export interface CloseExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  /** Ano do exercício a encerrar — já selecionado no seletor da PeriodsPanel. */
  year: number;
  /** Chamado com o JournalEntry retornado (novo OU idempotente — resposta HTTP idêntica). */
  onSuccess: (entry: JournalEntry) => void;
}

/**
 * Confirmation-only modal for closing the result of a fiscal year (encerramento do exercício,
 * BE-INCR-SPED-APURACAO). No form fields — the closing entry is composed entirely from the
 * ledger's pre-closing result balances on the backend. Idempotent per (unitId, year): a
 * re-close returns the SAME entry, HTTP 201 both times, with no flag distinguishing the two
 * cases — so success renders one neutral copy for both (BRIEF-W2-G FORK 2).
 */
export function CloseExerciseModal({ isOpen, onClose, unitId, year, onSuccess }: CloseExerciseModalProps) {
  const { t } = useTranslation('accounting');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successEntry, setSuccessEntry] = useState<JournalEntry | null>(null);

  function reset() {
    setError(null);
    setSuccessEntry(null);
  }

  function handleClose() {
    if (isSubmitting) return;
    reset();
    onClose();
  }

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    try {
      const entry = await accountingService.closeExercise(unitId, year);
      setSuccessEntry(entry);
      onSuccess(entry);
    } catch (err: unknown) {
      const { message } = resolveErrorWithCode(err, t('periods.closeExercise.error.generic', 'Erro ao encerrar o exercício.'));
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('periods.closeExercise.modal.title', 'Encerrar exercício {{year}}', { year })}
      maxWidth="max-w-md"
      isDirty={false}
      themeColor="bg-amber-600"
      footer={
        successEntry ? (
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
          >
            {t('periods.closeExercise.success.close', 'Fechar')}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:opacity-50"
            >
              {t('periods.closeExercise.modal.cancel', 'Cancelar')}
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isSubmitting}
              className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? t('periods.closeExercise.submitting', 'Encerrando…')
                : t('periods.closeExercise.modal.confirm', 'Encerrar')}
            </button>
          </>
        )
      }
    >
      <div className="space-y-4 px-6 py-5">
        {successEntry ? (
          <div className="rounded-2xl border border-amber-800/50 bg-amber-950/30 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-amber-200">
              {t('periods.closeExercise.success.title', 'Exercício encerrado.')}
            </p>
            <p className="text-sm text-amber-300/90 tabular-nums">
              {t('periods.closeExercise.success.entryInfo', 'Lançamento nº {{entryNumber}} — exercício {{fiscalYear}}', {
                entryNumber: successEntry.entryNumber ?? '—',
                fiscalYear: successEntry.fiscalYear ?? year,
              })}
            </p>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-neutral-500">{t('periods.fiscalYear', 'Exercício')}</dt>
              <dd className="text-neutral-200">{year}</dd>
              <dt className="text-neutral-500">{t('view.unit', 'Unidade')}</dt>
              <dd className="truncate text-neutral-200" title={unitId}>{unitId}</dd>
            </dl>
            <p className="text-sm text-neutral-300">
              {t(
                'periods.closeExercise.modal.description',
                'Esta operação lança um encerramento real no razão: zera as contas de Receita e Despesa do exercício {{year}} contra Lucros ou Prejuízos Acumulados (conta 2.3.1).',
                { year },
              )}
            </p>
          </>
        )}

        {error && (
          <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
