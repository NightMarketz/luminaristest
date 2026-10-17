import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// W7 item 4 (F-W7-2 a): o modal de erro mostra a saída certa para cada tipo de erro.
(globalThis as unknown as { React: typeof React }).React = React;
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import CreationArea from '../CreationArea';

const props = (kind: 'retryable' | 'partial' | 'already-provisioned' | 'invalid') => ({
  isCreating: false,
  creationError: { kind, message: 'msg do servidor' },
  onRetry: vi.fn(),
  onBackToConversation: vi.fn(),
});

describe('CreationArea — erro classificado (W7 item 4)', () => {
  it('retryable ⇒ "Tentar novamente" chama onRetry; mensagem do servidor como veio', () => {
    const p = props('retryable');
    render(<CreationArea {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'onboardingRetry' }));
    expect(p.onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'onboardingBackToConversation' })).toBeNull();
    expect(screen.getByText('msg do servidor')).toBeInTheDocument();
  });

  it('partial ⇒ sem retry; mensagem de suporte', () => {
    render(<CreationArea {...props('partial')} />);
    expect(screen.queryByRole('button', { name: 'onboardingRetry' })).toBeNull();
    expect(screen.getByText('onboardingErrorPartial')).toBeInTheDocument();
  });

  it('already-provisioned ⇒ sem retry; link para /dashboard', () => {
    render(<CreationArea {...props('already-provisioned')} />);
    expect(screen.queryByRole('button', { name: 'onboardingRetry' })).toBeNull();
    expect(screen.getByText('onboardingErrorAlreadyProvisioned')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'onboardingGoToDashboard' })).toHaveAttribute('href', '/dashboard');
  });

  it('invalid ⇒ sem retry; "Voltar à conversa" chama onBackToConversation', () => {
    const p = props('invalid');
    render(<CreationArea {...p} />);
    expect(screen.queryByRole('button', { name: 'onboardingRetry' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'onboardingBackToConversation' }));
    expect(p.onBackToConversation).toHaveBeenCalledTimes(1);
  });
});
