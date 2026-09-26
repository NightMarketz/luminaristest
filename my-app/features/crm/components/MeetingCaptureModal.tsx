import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Modal } from '../../../components/ui/Modal';

interface MeetingCaptureModalProps {
  isOpen: boolean;
  stageName: string;
  onCancel: () => void;
  /** `meetingAt` as a full ISO-8601 datetime (the backend stores it as nextActionAt). */
  onConfirm: (meetingAt: string) => void | Promise<void>;
}

/**
 * Captures the meeting date/time BEFORE running the transition into a `meeting`
 * stage — LeadsPlugin rejects the move without a future `nextActionAt`. Mirrors
 * ProposalCaptureModal / NoShowCaptureModal (isOpen-reset, submitting guard,
 * datetime-local → toISOString on confirm).
 */
export function MeetingCaptureModal({ isOpen, stageName, onCancel, onConfirm }: MeetingCaptureModalProps) {
  const { t } = useTranslation('crm');
  const [when, setWhen] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset the form each time the modal (re)opens.
  useEffect(() => {
    if (isOpen) {
      setWhen('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const whenMs = new Date(when).getTime();
  const isValid = when.trim() !== '' && Number.isFinite(whenMs) && whenMs > Date.now();

  const handleConfirm = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    await onConfirm(new Date(when).toISOString());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={t('meeting_capture.title', 'Agendar Reunião')}
      maxWidth="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-100 dark:border-white/10 dark:text-gray-200 dark:hover:bg-neutral-800"
          >
            {t('capture.cancel', 'Cancelar')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || submitting}
            className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('capture.confirm', 'Confirmar')}
          </button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          {t('meeting_capture.subtitle', 'Informe a data e o horário da reunião para mover o lead para')}{' '}
          <span className="font-black text-gray-700 dark:text-gray-200">{stageName}</span>.
        </p>
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">
            {t('meeting_capture.when', 'Data e horário')}
          </label>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            autoFocus
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-blue-400 dark:border-white/10 dark:bg-neutral-800 dark:text-gray-200"
          />
        </div>
      </div>
    </Modal>
  );
}

export default MeetingCaptureModal;
