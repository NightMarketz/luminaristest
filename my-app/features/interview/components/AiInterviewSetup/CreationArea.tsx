import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import CreatingAnimation from '../../setup/CreatingAnimation';
import type { ICreationError } from '../../types/InterviewTypes';

interface CreationAreaProps {
  isCreating: boolean;
  creationError: ICreationError | null;
  onRetry: () => void;
  onBackToConversation: () => void;
}

/** W7 item 4 (F-W7-2 a): a saída do erro depende do tipo — só `retryable` oferece "Tentar novamente". */
function CreationArea({ isCreating, creationError, onRetry, onBackToConversation }: CreationAreaProps) {
  const { t } = useTranslation('common');

  if (!isCreating && !creationError) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-neutral-800/75 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-xl max-w-lg w-full">
        {isCreating ? (
          <>
            <h2 className="text-2xl font-bold text-center mb-6 dark:text-white">
              {t('onboardingCreatingTitle')}
            </h2>
            <CreatingAnimation />
            <p className="text-center text-neutral-600 dark:text-neutral-300 mt-6">
              {t('onboardingCreatingWait')}
            </p>
          </>
        ) : creationError ? (
          <>
            <h2 className="text-2xl font-bold text-center text-red-600 mb-6">
              {t('onboardingErrorTitle')}
            </h2>
            <p className="text-center text-neutral-800 dark:text-neutral-200 mb-4">
              {creationError.kind === 'partial'
                ? t('onboardingErrorPartial')
                : creationError.kind === 'already-provisioned'
                  ? t('onboardingErrorAlreadyProvisioned')
                  : creationError.message}
            </p>
            <div className="flex justify-center">
              {creationError.kind === 'retryable' && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('onboardingRetry')}
                </button>
              )}
              {creationError.kind === 'invalid' && (
                <button
                  onClick={onBackToConversation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('onboardingBackToConversation')}
                </button>
              )}
              {creationError.kind === 'already-provisioned' && (
                <Link href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {t('onboardingGoToDashboard')}
                </Link>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default CreationArea;
