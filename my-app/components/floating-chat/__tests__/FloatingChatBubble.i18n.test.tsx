import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Lacuna L-20261111-214837-d745 (RUNBOOK-W7, 2ª execução): com a UI em inglês o botão flutuante expunha
// aria-label="Abrir chat" (fixo em português). O rótulo tem de vir de t('floatingChat.open').
vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => (k === 'floatingChat.open' ? 'Open chat' : k) }),
}));
vi.mock('../FloatingChatProvider', () => ({
  useFloatingChat: () => ({ isOpen: false, toggle: () => {} }),
}));

import { FloatingChatBubble } from '../FloatingChatBubble';

describe('FloatingChatBubble — i18n do aria-label', () => {
  it('usa o texto traduzido, não "Abrir chat" fixo', () => {
    render(<FloatingChatBubble />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Open chat');
  });
});
