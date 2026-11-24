/**
 * F1-N3 (achado do #1226): o `DocumentChatWidget` usava uma cópia antiga do hook de instâncias
 * (`chat/hooks/UseChatInstances.ts`), que lista os chats sem filtrar por tipo. Por isso o dropdown do chat de
 * documentos também mostrava os chats GENERIC do chat flutuante. O hook compartilhado
 * (`shared/hooks/useChatInstances.ts`) filtra por tipo, e é o que fica.
 * O cookie de "último chat" é do chat flutuante (GENERIC). O chat de documentos não pode sobrescrevê-lo.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, waitFor } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

const listInstances = vi.fn();
vi.mock('@/lib/services/chat.service', () => ({
  ChatService: { listInstances: (...a: unknown[]) => listInstances(...a), deleteInstance: vi.fn(), updateInstance: vi.fn() },
}));
const setCookie = vi.fn();
vi.mock('cookies-next', () => ({ setCookie: (...a: unknown[]) => setCookie(...a), getCookie: vi.fn(), deleteCookie: vi.fn() }));
vi.mock('../hooks/useChatInstance', () => ({
  useChatInstance: () => ({
    chatInstanceId: 'ci_1', chatTitle: 'Conversa', messages: [], setMessages: vi.fn(), isInstanceLoading: false,
    errorInstance: null, isDuplicateInstance: false, initializeChat: vi.fn(), resetChat: vi.fn(),
  }),
}));
vi.mock('../hooks/useChatMessages', () => ({
  useChatMessages: () => ({ handleSendMessage: vi.fn(), isSendingMessage: false, sendMessageError: null, clearSendMessageError: vi.fn(), messagesEndRef: { current: null } }),
}));
vi.mock('../components/DocumentSelector', () => ({ DocumentSelector: () => null }));

import DocumentChatWidget from '../components/DocumentChatWidget';
import { useChatInstances } from '../../shared/hooks/useChatInstances';

beforeEach(() => {
  listInstances.mockReset().mockResolvedValue([]);
  setCookie.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
});

describe('F1-N3 — instâncias do chat de documentos', () => {
  it('o dropdown do DocumentChatWidget lista só chats DOCUMENT', async () => {
    render(<DocumentChatWidget id="w1" onInstanceActivated={vi.fn()} onInstanceDeactivated={vi.fn()} activeChatInstanceIds={new Set()} />);
    await waitFor(() => expect(listInstances).toHaveBeenCalled());
    for (const call of listInstances.mock.calls) expect(call[0]).toBe('DOCUMENT');
  });

  it('só o chat GENERIC grava o cookie de último chat do chat flutuante', async () => {
    const props = { currentWidgetInstanceId: 'w-123', onSelectChatInstance: vi.fn() };
    // Controle positivo primeiro: prova que a espera cobre o `import('cookies-next')` dinâmico.
    renderHook(() => useChatInstances({ ...props, chatType: 'GENERIC' }));
    await waitFor(() => expect(setCookie).toHaveBeenCalledTimes(1));
    setCookie.mockReset();
    renderHook(() => useChatInstances({ ...props, chatType: 'DOCUMENT' }));
    await waitFor(() => expect(listInstances).toHaveBeenCalledWith('DOCUMENT'));
    await new Promise((r) => setTimeout(r, 50));
    expect(setCookie).not.toHaveBeenCalled();
  });
});
