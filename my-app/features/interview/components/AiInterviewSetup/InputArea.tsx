import React, { KeyboardEvent } from 'react';
import { useTranslation } from 'next-i18next';

interface InputAreaProps {
  userInput: string;
  setUserInput: (value: string) => void;
  handleSendMessage: () => void;
  isLoading: boolean;
  isCreating: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function InputArea({ userInput, setUserInput, handleSendMessage, isLoading, isCreating, inputRef }: InputAreaProps) {
  const { t } = useTranslation('common');
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && !isCreating) {
      handleSendMessage();
    }
  };

  return (
    <div className="mt-4 flex">
      <input
        ref={inputRef}
        type="text"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={t('onboardingInterviewInputPlaceholder')}
        className="flex-grow p-3 border border-neutral-300 dark:border-neutral-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:text-white"
        disabled={isLoading || isCreating}
        autoComplete="off"
      />
      <button
        onClick={handleSendMessage}
        disabled={isLoading || isCreating}
        className="bg-blue-600 text-white px-6 py-3 rounded-r-lg hover:bg-blue-700 disabled:bg-neutral-400 dark:disabled:bg-neutral-500"
      >
        Enviar
      </button>
    </div>
  );
}

export default InputArea;
