/**
 * FIX-CHAT-AGENTE lote A, §3.3 #5 do ACHADOS-2026-10-19 — o `DocumentChatWidget` descartava `type`/`proposal`
 * da resposta do /chat, e `ACTION_PROPOSAL` virava beco sem saída ("confirme no modal abaixo" sem modal).
 * Autorização: dono, chat, 2026-10-21 e 2026-10-22 ("Todos os 22 em série").
 */
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

const sendMessage = vi.fn();
vi.mock('@/lib/services/chat.service', () => ({ ChatService: { sendMessage: (...a: unknown[]) => sendMessage(...a) } }));

import { useChatMessages } from '../hooks/useChatMessages';

const PROPOSAL = { id: 'p1', action: 'CREATE' as const, tableName: 'customers', tableLabel: 'Clientes', data: { name: 'Joana' } };

function useHarness() {
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
  const inputRef = React.createRef<HTMLTextAreaElement>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- o harness aceita o Message estendido do fix
  const hook = useChatMessages({ chatInstanceId: 'ci_1', isInstanceLoading: false, messages: messages as any, setMessages: setMessages as any, inputRef, selectedDocumentIds: [] });
  return { messages, hook };
}

beforeEach(() => {
  sendMessage.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
});

describe('useChatMessages do DocumentChatWidget — proposta de ação', () => {
  it('guarda type e proposal da resposta ACTION_PROPOSAL na mensagem do assistente', async () => {
    sendMessage.mockResolvedValue({ answer: 'confirme no modal', type: 'ACTION_PROPOSAL', proposal: PROPOSAL });
    const { result } = renderHook(() => useHarness());

    await act(async () => { await result.current.hook.handleSendMessage('cria a cliente Joana'); });

    expect(result.current.messages.at(-1)).toMatchObject({ role: 'assistant', type: 'ACTION_PROPOSAL', proposal: PROPOSAL });
  });

  it('a confirmação manda o confirmedProposalId ao /chat', async () => {
    sendMessage.mockResolvedValue({ answer: 'Pronto!', type: 'TEXT' });
    const { result } = renderHook(() => useHarness());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- assinatura de 2 args vem com o fix
    await act(async () => { await (result.current.hook.handleSendMessage as any)('', 'p1'); });

    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({ chatInstanceId: 'ci_1', confirmedProposalId: 'p1' }));
  });
});

describe('DocumentChatWidget — modal da proposta', () => {
  it('última mensagem ACTION_PROPOSAL abre o modal; "Confirmar e Aplicar" confirma pelo id', async () => {
    vi.resetModules();
    const handleSendMessage = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../hooks/useChatInstance', () => ({
      useChatInstance: () => ({
        chatInstanceId: 'ci_1', chatTitle: 'Conversa', setMessages: vi.fn(), isInstanceLoading: false, errorInstance: null,
        isDuplicateInstance: false, initializeChat: vi.fn(), resetChat: vi.fn(),
        messages: [
          { role: 'user', content: 'cria a cliente Joana' },
          { role: 'assistant', content: 'confirme no modal', type: 'ACTION_PROPOSAL', proposal: PROPOSAL },
        ],
      }),
    }));
    vi.doMock('../hooks/UseChatInstances', () => ({
      useChatInstances: () => ({
        allChatInstances: [], isDropdownOpen: false, toggleDropdown: vi.fn(), handleSelectInstance: vi.fn(), handleInitiateNewChat: vi.fn(),
        instanceIdPendingDelete: null, isDeletingInstance: false, deleteInstanceError: null, requestDeleteConfirmation: vi.fn(),
        cancelDeleteConfirmation: vi.fn(), confirmDeleteInstance: vi.fn(), loadInstancesError: null, isLoadingInstances: false,
      }),
    }));
    vi.doMock('../hooks/useChatMessages', () => ({
      useChatMessages: () => ({ handleSendMessage, isSendingMessage: false, sendMessageError: null, clearSendMessageError: vi.fn(), messagesEndRef: { current: null } }),
    }));
    vi.doMock('../components/DocumentSelector', () => ({ DocumentSelector: () => null }));
    const { default: DocumentChatWidget } = await import('../components/DocumentChatWidget');

    render(
      <DocumentChatWidget id="w1" onInstanceActivated={vi.fn()} onInstanceDeactivated={vi.fn()} activeChatInstanceIds={new Set()} />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByText('Confirmar e Aplicar')); });
    expect(handleSendMessage).toHaveBeenCalledWith('', 'p1');
  });
});
