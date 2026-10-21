import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import type { CustomizeFieldsResult } from '@/lib/services/interview.service';
import type { ITable } from '../../../types/RightSidebarTypes';

// Achados da revisão do #785 (dono, chat, 2026-10-21: "Corrige todos, nos PRs certos"): o modo IA não pode levar ao
// hook a edição manual não salva; a proposta vencida (409) sai também do hook; Enter respeita o envio em andamento;
// um erro limpa o "ficou fora da proposta" do turno anterior.
(globalThis as unknown as { React: typeof React }).React = React;
vi.mock('cookies-next', () => ({ getCookie: () => 'tok' }));
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));

import RightSidebar from '../index';

Element.prototype.scrollIntoView = vi.fn();

function res(status: number, body: unknown): Response {
  return { ok: status < 400, status, statusText: 'X', text: async () => JSON.stringify(body) } as unknown as Response;
}
const fetchMock = () => vi.mocked(globalThis.fetch);

const tabela: ITable = {
  key: 'clientes',
  name: 'Clientes',
  description: 'Cadastro de clientes',
  conversationHistory: [],
  fields: [{ name: 'nome', label: 'Nome', type: 'string', required: true }],
};
const historico: CustomizeFieldsResult['conversationHistory'] = [
  { role: 'user', content: 'quero cidade', at: '2026-10-21T12:00:00.000Z' },
  { role: 'assistant', content: 'Proponho Cidade.', at: '2026-10-21T12:00:01.000Z' },
];
const proposta: NonNullable<CustomizeFieldsResult['proposal']> = {
  id: 'p1',
  requiresSensitiveAck: false,
  changes: [{ action: 'add', field: { name: 'cidade', label: 'Cidade', type: 'string' }, sensitiveCategory: null, presetKey: null }],
};
const turno = (over: Partial<CustomizeFieldsResult> = {}): CustomizeFieldsResult => ({
  sessionId: 's1',
  tableKey: 'clientes',
  table: { ...tabela, conversationHistory: historico },
  conversationHistory: historico,
  proposal: null,
  discarded: [],
  ...over,
});

/** Faz o papel do `useAiInterview`: `onUpdateTable` troca a tabela selecionada, como o `handleUpdateTable`. */
function montar() {
  const onUpdateTable = vi.fn();
  function ComHook() {
    const [selecionada, setSelecionada] = useState<ITable>(tabela);
    return (
      <RightSidebar
        selectedTable={selecionada}
        isVisible
        sessionId="s1"
        onUpdateTable={(t) => { onUpdateTable(t); setSelecionada(t); }}
        presetKey={null}
      />
    );
  }
  return { ...render(<ComHook />), onUpdateTable };
}

const modo = (m: 'Ai' | 'Manual') => fireEvent.click(screen.getByText(`onboardingFieldsMode${m}`));
async function enviar(texto: string) {
  const caixa = screen.getByPlaceholderText('onboardingFieldsAiInputPlaceholder');
  fireEvent.change(caixa, { target: { value: texto } });
  fireEvent.keyDown(caixa, { key: 'Enter' });
}
function adicionarLocal(name: string, label: string) {
  fireEvent.click(screen.getByText('onboardingFieldsNewField'));
  fireEvent.change(document.getElementById('field-name')!, { target: { value: name } });
  fireEvent.change(document.getElementById('field-label')!, { target: { value: label } });
  fireEvent.click(screen.getByText('onboardingFieldsAdd'));
}

describe('RightSidebar × modo IA — achados da revisão do #785', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('turno da IA não leva ao hook a edição manual não salva, e ela continua na tela do manual', async () => {
    fetchMock().mockResolvedValue(res(200, turno()));
    const { onUpdateTable } = montar();
    adicionarLocal('apelido', 'Apelido'); // sem Salvar
    modo('Ai');
    await enviar('quero cidade');
    await waitFor(() => expect(onUpdateTable).toHaveBeenCalled());
    for (const [t] of onUpdateTable.mock.calls) {
      expect((t as ITable).fields?.map((f) => f.name)).toEqual(['nome']);
    }
    modo('Manual');
    expect(screen.getByText('Apelido')).toBeInTheDocument();
  });

  it('409 PROPOSAL_STALE tira a pendente também do hook: ao reabrir o modo IA, o cartão vencido não volta', async () => {
    fetchMock()
      .mockResolvedValueOnce(res(200, turno({ proposal: proposta, table: { ...tabela, conversationHistory: historico, pendingProposal: { id: 'p1', changes: proposta.changes, createdAt: 'x' } } })))
      .mockResolvedValueOnce(res(409, { code: 'PROPOSAL_STALE', message: 'x' }));
    montar();
    modo('Ai');
    await enviar('quero cidade');
    await screen.findByTestId('ai-proposal');
    fireEvent.click(screen.getByText('onboardingFieldsAiApply'));
    await waitFor(() => expect(screen.queryByTestId('ai-proposal')).toBeNull());
    modo('Manual');
    modo('Ai');
    expect(screen.queryByTestId('ai-proposal')).toBeNull();
  });

  it('Enter com um envio em andamento não dispara um segundo turno', async () => {
    let soltar: (r: Response) => void = () => {};
    fetchMock().mockReturnValueOnce(new Promise<Response>((r) => { soltar = r; }));
    montar();
    modo('Ai');
    await enviar('primeira');
    await enviar('segunda');
    expect(fetchMock()).toHaveBeenCalledTimes(1);
    soltar(res(200, turno()));
    await waitFor(() => expect(screen.queryAllByTestId('ai-message').length).toBeGreaterThan(0));
  });

  it('erro num turno limpa o "ficou fora da proposta" do turno anterior', async () => {
    fetchMock()
      .mockResolvedValueOnce(res(200, turno({ discarded: [{ name: 'id', reason: 'reserved' }] })))
      .mockResolvedValueOnce(res(500, { code: 'INTERNAL_SERVER_ERROR', message: 'x' }));
    montar();
    modo('Ai');
    await enviar('quero um campo id');
    await screen.findByTestId('ai-discarded');
    await enviar('de novo');
    await waitFor(() => expect(screen.queryAllByTestId('ai-message').map((e) => e.textContent).join('|')).toContain('onboardingFieldsAiSendFailed'));
    expect(screen.queryByTestId('ai-discarded')).toBeNull();
  });
});
