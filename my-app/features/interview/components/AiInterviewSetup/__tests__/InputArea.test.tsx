import React, { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Achado do RUNBOOK-W3-ESCOLHA-CRIACAO (06/11): o botão era "Enviar" fixo, também com a UI em inglês.
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import InputArea from '../InputArea';

describe('InputArea', () => {
  it('o rótulo do botão de envio vem do i18n', () => {
    render(
      <InputArea userInput="" setUserInput={() => {}} handleSendMessage={() => {}} isLoading={false} isCreating={false} inputRef={createRef<HTMLInputElement>()} />,
    );
    expect(screen.getByRole('button', { name: 'onboardingInterviewSend' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar' })).toBeNull();
  });
});
