import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import type { CustomizeFieldsResult } from '@/lib/services/interview.service';
import type { ITable } from '../../../types/RightSidebarTypes';

// Achado 1 do #785 (dono, chat, 2026-10-21: "Corrija os 4"; GAP-MAP Nível 3): depois de um turno sem Aplicar,
// alternar Manual → IA remonta o AIChatMode com a tabela do estado do hook. A conversa tem de ser a do servidor.
(globalThis as unknown as { React: typeof React }).React = React;
vi.mock('cookies-next', () => ({ getCookie: () => 'tok' }));
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));

import RightSidebar from '../index';

Element.prototype.scrollIntoView = vi.fn();

function res(status: number, body: unknown): Response {
  return { ok: status < 400, status, statusText: 'X', text: async () => JSON.stringify(body) } as unknown as Response;
}

const tabela: ITable = {
  key: 'clientes',
  name: 'Clientes',
  description: 'Cadastro de clientes',
  conversationHistory: [],
  fields: [{ name: 'nome', label: 'Nome', type: 'string', required: true }],
};

const historico: CustomizeFieldsResult['conversationHistory'] = [
  { role: 'user', content: 'preciso guardar alergias', at: '2026-10-20T12:00:00.000Z' },
  { role: 'assistant', content: 'Proponho o campo Alergias.', at: '2026-10-20T12:00:01.000Z' },
];

/** Faz o papel do `useAiInterview`: `onUpdateTable` troca a tabela selecionada, como o `handleUpdateTable`. */
function ComHook() {
  const [selecionada, setSelecionada] = useState<ITable>(tabela);
  return <RightSidebar selectedTable={selecionada} isVisible sessionId="s1" onUpdateTable={setSelecionada} presetKey={null} />;
}

const textos = () => screen.queryAllByTestId('ai-message').map((el) => el.textContent ?? '');

describe('RightSidebar — histórico do modo IA ao alternar de modo (achado 1 do #785)', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('turno sem Aplicar → Manual → IA: a conversa é a que o servidor devolveu', async () => {
    const resposta: CustomizeFieldsResult = {
      sessionId: 's1',
      tableKey: 'clientes',
      table: { ...tabela, conversationHistory: historico },
      conversationHistory: historico,
      proposal: null,
      discarded: [],
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(res(200, resposta));
    render(<ComHook />);

    fireEvent.click(screen.getByText('onboardingFieldsModeAi'));
    const caixa = screen.getByPlaceholderText('onboardingFieldsAiInputPlaceholder');
    fireEvent.change(caixa, { target: { value: 'preciso guardar alergias' } });
    fireEvent.keyDown(caixa, { key: 'Enter' });
    await waitFor(() => expect(textos().join('|')).toContain('Proponho o campo Alergias.'));

    fireEvent.click(screen.getByText('onboardingFieldsModeManual'));
    fireEvent.click(screen.getByText('onboardingFieldsModeAi'));
    expect(textos().join('|')).toContain('Proponho o campo Alergias.');
  });

  it('turno sem Aplicar não apaga o que o modo manual editou (só o Aplicar troca os campos)', async () => {
    // O servidor não conhece a edição manual: a tabela dele volta sem o campo novo.
    const resposta: CustomizeFieldsResult = {
      sessionId: 's1',
      tableKey: 'clientes',
      table: { ...tabela, conversationHistory: historico },
      conversationHistory: historico,
      proposal: null,
      discarded: [],
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(res(200, resposta));
    const editada: ITable = { ...tabela, fields: [...(tabela.fields ?? []), { name: 'apelido', label: 'Apelido', type: 'string' }] };
    const onUpdateTable = vi.fn();
    render(<RightSidebar selectedTable={editada} isVisible sessionId="s1" onUpdateTable={onUpdateTable} presetKey={null} />);

    fireEvent.click(screen.getByText('onboardingFieldsModeAi'));
    const caixa = screen.getByPlaceholderText('onboardingFieldsAiInputPlaceholder');
    fireEvent.change(caixa, { target: { value: 'preciso guardar alergias' } });
    fireEvent.keyDown(caixa, { key: 'Enter' });
    await waitFor(() => expect(onUpdateTable).toHaveBeenCalledTimes(1));
    expect(onUpdateTable).toHaveBeenCalledWith(expect.objectContaining({ fields: editada.fields, conversationHistory: historico }));
  });
});
