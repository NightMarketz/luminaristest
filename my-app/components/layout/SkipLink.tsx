import React from 'react';
import { useTranslation } from 'next-i18next';

/** Primeiro foco da página: pula a Navbar e vai para o conteúdo principal (`#main-content`). */
export function SkipLink() {
  const { t } = useTranslation('common');
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[10000] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-neutral-900 focus:shadow-lg dark:focus:bg-neutral-900 dark:focus:text-white"
    >
      {t('skipToContent', 'Skip to main content')}
    </a>
  );
}
