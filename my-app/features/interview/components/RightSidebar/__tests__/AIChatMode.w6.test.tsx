import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import type { CustomizeFieldsDtoInput } from '@/types/contracts/interview/CustomizeFields.dto.gen';
import type { CustomizeFieldsResult } from '@/lib/services/interview.service';

// W6 FE (BRIEF WIZARD-W6 itens 13–17): corpo pelo DTO gerado, histórico do servidor, cartão de proposta, ciência do
// dado sensível e erros por `code`. O `fetch` é o global, atravessando o InterviewService e o apiClient reais.
(globalThis as unknown as { React: typeof React }).React = React;
vi.mock('cookies-next', () => ({ getCookie: () => 'tok' }));
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));

import AIChatMode from '../AIChatMode';

Element.prototype.scrollIntoView = vi.fn();

function res(status: number, body: unknown): Response {
  return { ok: status < 400, status, statusText: 'X', text: async () => JSON.stringify(body) } as unknown as Response;
}
const fetchMock = () => vi.mocked(globalThis.fetch);
function bodyOf(call: number): unknown {
  const [, init] = fetchMock().mock.calls[call] as [string, RequestInit];
  return JSON.parse(String(init.body));
}

const tabela = {
  key: 'clientes',
  name: 'Clientes',
  description: 'Cadastro de clientes',
  conversationHistory: [],
  fields: [
    { name: 'nome', label: 'Nome', type: 'string', required: true },
    { name: 'fax', label: 'Fax', type: 'string' },
  ],
};

const historico: CustomizeFieldsResult['conversationHistory'] = [
  { role: 'user', content: 'preciso guardar alergias', at: '2026-10-20T12:00:00.000Z' },
  { role: 'assistant', content: 'Proponho o campo Alergias.', at: '2026-10-20T12:00:01.000Z' },
];

function resultado(over: Partial<CustomizeFieldsResult> = {}): CustomizeFieldsResult {
  return {
    sessionId: 's1',
    tableKey: 'clientes',
    table: { ...tabela, conversationHistory: historico },
    conversationHistory: historico,
    proposal: null,
    discarded: [],
    ...over,
  };
}

const propostaSensivel: NonNullable<CustomizeFieldsResult['proposal']> = {
  id: 'p1',
  requiresSensitiveAck: true,
  changes: [
    { action: 'add', field: { name: 'alergias', label: 'Alergias', type: 'textarea' }, sensitiveCategory: 'health', presetKey: null },
    { action: 'remove', originalName: 'fax' },
  ],
};
const propostaComum: NonNullable<CustomizeFieldsResult['proposal']> = {
  id: 'p2',
  requiresSensitiveAck: false,
  changes: [{ action: 'update', originalName: 'nome', field: { name: 'nome', label: 'Nome completo', type: 'string' }, sensitiveCategory: null }],
};

function montar(props: Partial<React.ComponentProps<typeof AIChatMode>> = {}) {
  const onSaveChanges = vi.fn();
  const onSync = vi.fn();
  const onSessionLost = vi.fn();
  const view = render(
    <AIChatMode tableData={tabela} sessionId="s1" onSaveChanges={onSaveChanges} onSync={onSync} onClose={vi.fn()} onSessionLost={onSessionLost} {...props} />,
  );
  return { ...view, onSaveChanges, onSync, onSessionLost };
}

async function enviar(texto: string) {
  fireEvent.change(screen.getByPlaceholderText('onboardingFieldsAiInputPlaceholder'), { target: { value: texto } });
  fireEvent.keyDown(screen.getByPlaceholderText('onboardingFieldsAiInputPlaceholder'), { key: 'Enter' });
}

const textos = () => screen.queryAllByTestId('ai-message').map((el) => el.textContent ?? '');

describe('AIChatMode — W6 FE', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('item 13: o turno manda {kind:"message", sessionId, tableKey, message}, sem conversationHistory', async () => {
    fetchMock().mockResolvedValue(res(200, resultado()));
    montar();
    await enviar('  preciso guardar alergias  ');
    await waitFor(() => expect(fetchMock()).toHaveBeenCalledTimes(1));
    const [url] = fetchMock().mock.calls[0] as [string];
    expect(url).toMatch(/\/dashboard\/ai\/CustomizeFields$/);
    const esperado: CustomizeFieldsDtoInput = { kind: 'message', sessionId: 's1', tableKey: 'clientes', message: 'preciso guardar alergias' };
    expect(bodyOf(0)).toEqual(esperado);
  });

  it('item 14: a conversa é a conversationHistory da resposta, na ordem do servidor; system vira nota', async () => {
    const comNota = [...historico, { role: 'system' as const, content: 'Proposta aplicada.', at: '2026-10-20T12:00:02.000Z' }];
    fetchMock().mockResolvedValue(res(200, resultado({ conversationHistory: comNota })));
    montar();
    expect(textos().join('|')).toContain('onboardingFieldsAiWelcome'); // sem histórico: boas-vindas locais
    await enviar('oi');
    await waitFor(() => expect(textos()[2]).toContain('Proposta aplicada.'));
    const linhas = screen.getAllByTestId('ai-message');
    expect(linhas.map((el) => el.getAttribute('data-role'))).toEqual(['user', 'assistant', 'system']);
    expect(textos()[0]).toContain('preciso guardar alergias');
    expect(textos()[2]).toContain('Proposta aplicada.');
    expect(textos().join('|')).not.toContain('onboardingFieldsAiWelcome');
  });

  it('item 14: o histórico já gravado na tabela abre a conversa', () => {
    montar({ tableData: { ...tabela, conversationHistory: historico } });
    expect(textos()).toHaveLength(2);
    expect(textos()[1]).toContain('Proponho o campo Alergias.');
  });

  it('item 15: o cartão mostra o diff; Aplicar manda decision:"apply" e onSaveChanges recebe data.table', async () => {
    const tabelaDoServidor = { ...tabela, fields: [{ name: 'nome', label: 'Nome completo', type: 'string', required: true }], conversationHistory: historico };
    fetchMock()
      .mockResolvedValueOnce(res(200, resultado({ proposal: propostaComum })))
      .mockResolvedValueOnce(res(200, resultado({ table: tabelaDoServidor, applied: true })));
    const { onSaveChanges } = montar();
    await enviar('quero o nome completo');
    const cartao = await screen.findByTestId('ai-proposal');
    expect(cartao.textContent).toContain('onboardingFieldsAiChangeUpdate');
    expect(cartao.textContent).toContain('Nome completo');
    expect(cartao.textContent).toContain('string');

    fireEvent.click(screen.getByText('onboardingFieldsAiApply'));
    await waitFor(() => expect(onSaveChanges).toHaveBeenLastCalledWith(tabelaDoServidor));
    const esperado: CustomizeFieldsDtoInput = { kind: 'decision', sessionId: 's1', tableKey: 'clientes', proposalId: 'p2', decision: 'apply' };
    expect(bodyOf(1)).toEqual(esperado);
    expect(screen.queryByTestId('ai-proposal')).toBeNull();
  });

  it('item 15: Descartar manda decision:"discard"; o hook recebe só histórico e pendente, nenhuma tabela', async () => {
    fetchMock()
      .mockResolvedValueOnce(res(200, resultado({ proposal: propostaComum })))
      .mockResolvedValueOnce(res(200, resultado({ applied: false })));
    const { onSaveChanges, onSync } = montar();
    await enviar('quero o nome completo');
    await screen.findByTestId('ai-proposal');
    fireEvent.click(screen.getByText('onboardingFieldsAiDiscard'));
    await waitFor(() => expect(screen.queryByTestId('ai-proposal')).toBeNull());
    expect(bodyOf(1)).toMatchObject({ kind: 'decision', proposalId: 'p2', decision: 'discard' });
    // Achado 1 do #785: todo turno sincroniza o hook (senão a pendente descartada voltaria ao remontar).
    expect(onSync).toHaveBeenLastCalledWith({ conversationHistory: historico, pendingProposal: undefined });
    expect(onSaveChanges).not.toHaveBeenCalled();
  });

  it('item 16: campo sensível tem selo; Aplicar desabilitado até marcar a ciência, que vai como acknowledgeSensitive:true', async () => {
    fetchMock()
      .mockResolvedValueOnce(res(200, resultado({ proposal: propostaSensivel })))
      .mockResolvedValueOnce(res(200, resultado({ applied: true })));
    montar();
    await enviar('preciso guardar alergias');
    const cartao = await screen.findByTestId('ai-proposal');
    expect(screen.getAllByTestId('ai-sensitive-badge')).toHaveLength(1);
    expect(cartao.textContent).toContain('onboardingFieldsAiSensitiveNotice');
    // Remoção mostra rótulo e tipo da tabela atual.
    expect(screen.getAllByTestId('ai-proposal-change')[1].textContent).toContain('Fax');

    const aplicar = screen.getByText('onboardingFieldsAiApply');
    const ciencia = screen.getByLabelText('onboardingFieldsAiSensitiveAck') as HTMLInputElement;
    expect(ciencia.checked).toBe(false);
    expect(aplicar).toBeDisabled();

    fireEvent.click(ciencia);
    expect(aplicar).not.toBeDisabled();
    fireEvent.click(aplicar);
    await waitFor(() => expect(fetchMock()).toHaveBeenCalledTimes(2));
    const esperado: CustomizeFieldsDtoInput = {
      kind: 'decision', sessionId: 's1', tableKey: 'clientes', proposalId: 'p1', decision: 'apply', acknowledgeSensitive: true,
    };
    expect(bodyOf(1)).toEqual(esperado);
  });

  it('item 17: INTERVIEW_SESSION_NOT_FOUND → nota de sessão expirada e a entrevista volta à escolha', async () => {
    fetchMock().mockResolvedValue(res(404, { code: 'INTERVIEW_SESSION_NOT_FOUND', message: 'x' }));
    const { onSessionLost } = montar();
    await enviar('oi');
    await waitFor(() => expect(textos().join('|')).toContain('onboardingFieldsAiSessionLost'));
    expect(onSessionLost).toHaveBeenCalledTimes(1);
  });

  it('item 17: PROPOSAL_STALE → "a proposta mudou" e o cartão velho sai', async () => {
    fetchMock()
      .mockResolvedValueOnce(res(200, resultado({ proposal: propostaComum })))
      .mockResolvedValueOnce(res(409, { code: 'PROPOSAL_STALE', message: 'x' }));
    const { onSaveChanges, onSessionLost } = montar();
    await enviar('quero o nome completo');
    await screen.findByTestId('ai-proposal');
    fireEvent.click(screen.getByText('onboardingFieldsAiApply'));
    await waitFor(() => expect(textos().join('|')).toContain('onboardingFieldsAiProposalStale'));
    expect(screen.queryByTestId('ai-proposal')).toBeNull();
    expect(onSaveChanges).not.toHaveBeenCalled(); // o 409 não sobe tabela
    expect(onSessionLost).not.toHaveBeenCalled();
  });

  it('item 17: outro código (mesmo 404) → erro genérico, sem derrubar a sessão', async () => {
    fetchMock().mockResolvedValue(res(404, { code: 'TABLE_NOT_IN_SESSION', message: 'x' }));
    const { onSessionLost } = montar();
    await enviar('oi');
    await waitFor(() => expect(textos().join('|')).toContain('onboardingFieldsAiSendFailed'));
    expect(onSessionLost).not.toHaveBeenCalled();
  });
});

// Achados fora de escopo do #785, corrigidos por ordem do dono (chat, 2026-10-21: "Corrija os 4"). GAP-MAP Nível 3.
describe('AIChatMode — achados do #785 (testes-guarda)', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('achado 2: a proposta pendente da sessão reaparece ao remontar, com a ciência exigida', async () => {
    fetchMock().mockResolvedValue(res(200, resultado({ applied: true })));
    // Revisão do #786: a sessão guarda `requiresSensitiveAck` na pendente; o painel lê, não recalcula.
    const comPendente = {
      ...tabela,
      conversationHistory: historico,
      pendingProposal: { id: 'p1', changes: propostaSensivel.changes, createdAt: '2026-10-20T12:00:01.000Z', requiresSensitiveAck: true },
    };
    montar({ tableData: comPendente });
    expect(screen.queryByTestId('ai-proposal')).not.toBeNull();
    expect(screen.getByText('onboardingFieldsAiApply')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('onboardingFieldsAiSensitiveAck'));
    fireEvent.click(screen.getByText('onboardingFieldsAiApply'));
    await waitFor(() => expect(fetchMock()).toHaveBeenCalledTimes(1));
    expect(bodyOf(0)).toMatchObject({ kind: 'decision', proposalId: 'p1', decision: 'apply', acknowledgeSensitive: true });
  });

  it('achado 3: o que o servidor descartou aparece com nome e motivo', async () => {
    fetchMock().mockResolvedValue(res(200, resultado({
      proposal: propostaComum,
      discarded: [{ name: 'id', reason: 'reserved' }, { name: 'cliente', reason: 'type_not_allowed' }],
    })));
    montar();
    await enviar('quero um campo id e uma relação com cliente');
    const bloco = await screen.findByTestId('ai-discarded');
    expect(bloco.textContent).toContain('onboardingFieldsAiDiscardedTitle');
    expect(bloco.textContent).toContain('id');
    expect(bloco.textContent).toContain('onboardingFieldsAiDiscardedReserved');
    expect(bloco.textContent).toContain('cliente');
    expect(bloco.textContent).toContain('onboardingFieldsAiDiscardedTypeNotAllowed');
  });

  it('achado 4: HTML no conteúdo vira texto; só a formatação simples (negrito) vira marcação', () => {
    const injetado = [
      { role: 'user', content: '<img src=x onerror="window.__w6xss=1"> **alergias**', at: '2026-10-20T12:00:00.000Z' },
    ];
    const { container } = montar({ tableData: { ...tabela, conversationHistory: injetado } });
    expect(container.querySelector('img')).toBeNull();
    expect(textos()[0]).toContain('<img src=x onerror="window.__w6xss=1">');
    expect(container.querySelector('strong')?.textContent).toBe('alergias');
  });
});

// Revisão do #786 (dono, questionário, 2026-10-21: o servidor decide a ciência).
describe('AIChatMode — revisão do #786', () => {
  it('a pendente restaurada usa requiresSensitiveAck da sessão, sem recalcular pela categoria', () => {
    const comPendente = {
      ...tabela,
      conversationHistory: historico,
      pendingProposal: { id: 'p9', requiresSensitiveAck: true, createdAt: 'x', changes: propostaComum.changes },
    };
    montar({ tableData: comPendente });
    expect(screen.getByText('onboardingFieldsAiApply')).toBeDisabled();
    expect(screen.getByLabelText('onboardingFieldsAiSensitiveAck')).toBeInTheDocument();
  });
});
