import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Modal } from '../../../../components/ui/Modal';
import type { CreationChoice as Choice, ICreationChoicePrompt } from '../../types/InterviewTypes';

/**
 * W3 FE-INCR-W3-CHOICE (itens 7–12): a escolha criar × customizar por botões, no padrão visual do `FiscalQuestion`.
 * "Customizar" envia direto (reversível, F-W3-B4); "Criar" confirma em `Modal` (item 9); com `reason ===
 * 'declined_customize'` o modal da negação abre sozinho e seus botões já são a confirmação (F-W3-B3).
 */
interface CreationChoiceProps {
  prompt: ICreationChoicePrompt;
  presetKey: string | null;
  disabled: boolean;
  onChoose: (choice: Choice) => void;
}

const primary = 'rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';
const secondary = 'rounded-2xl border-2 border-neutral-200 bg-white px-6 py-3 font-bold text-neutral-700 transition-colors hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';

export default function CreationChoice({ prompt, presetKey, disabled, onChoose }: CreationChoiceProps) {
  const { t } = useTranslation('common');
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Cada resposta do servidor traz um `prompt` novo: dispensar o modal da negação vale só para este.
  const [dismissedFor, setDismissedFor] = useState<ICreationChoicePrompt | null>(null);
  const declinedOpen = prompt.reason === 'declined_customize' && dismissedFor !== prompt;

  return (
    <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" disabled={disabled} onClick={() => setConfirmOpen(true)} className={primary}>
          {t('choiceCreateNow')}
        </button>
        <button type="button" disabled={disabled} onClick={() => onChoose('customize')} className={secondary}>
          {t('choiceCustomize')}
        </button>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('choiceConfirmCreateTitle')}
        footer={
          <>
            <button type="button" onClick={() => setConfirmOpen(false)} className={secondary}>{t('choiceBack')}</button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => { setConfirmOpen(false); onChoose('create'); }}
              className={primary}
            >
              {t('choiceConfirm')}
            </button>
          </>
        }
      >
        <p className="p-6 text-sm text-neutral-600 dark:text-neutral-400">{t('choiceConfirmCreateBody', { preset: presetKey ?? '' })}</p>
      </Modal>

      <Modal
        isOpen={declinedOpen}
        onClose={() => setDismissedFor(prompt)}
        title={t('choiceDeclinedTitle')}
        footer={
          <>
            <button type="button" disabled={disabled} onClick={() => onChoose('customize')} className={secondary}>{t('choiceCustomizeAnyway')}</button>
            <button type="button" disabled={disabled} onClick={() => onChoose('create')} className={primary}>{t('choiceCreateShort')}</button>
          </>
        }
      >
        <p className="p-6 text-sm text-neutral-600 dark:text-neutral-400">{t('choiceDeclinedBody')}</p>
      </Modal>
    </div>
  );
}
