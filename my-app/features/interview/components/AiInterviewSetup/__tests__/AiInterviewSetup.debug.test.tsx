import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// W7 item 2: sem botão Debug na Entrevista (vazava conversa + estado no console).
(globalThis as unknown as { React: typeof React }).React = React;
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../../../hooks/useAiInterview', () => ({
  useAiInterview: () => ({
    messages: [], userInput: '', setUserInput: vi.fn(), isLoading: false, isCreating: false, creationError: null,
    customizationState: null, showCustomizationPanel: false, setShowCustomizationPanel: vi.fn(),
    showRightPanel: false, setShowRightPanel: vi.fn(), selectedTable: null,
    chatEndRef: { current: null }, inputRef: { current: null }, sessionId: null,
    handleSendMessage: vi.fn(), handleSelectTable: vi.fn(), handleUpdateTable: vi.fn(),
    logState: vi.fn(), handleRetry: vi.fn(), backToConversation: vi.fn(), presetKey: null, choicePrompt: null,
    sendCreationChoice: vi.fn(), fiscalPendente: false, confirmarFiscal: vi.fn(),
  }),
}));

import AiInterviewSetup from '..';

describe('AiInterviewSetup (W7 item 2)', () => {
  it('não renderiza botão Debug', () => {
    render(<AiInterviewSetup />);
    expect(screen.queryByRole('button', { name: /debug/i })).toBeNull();
  });
});
