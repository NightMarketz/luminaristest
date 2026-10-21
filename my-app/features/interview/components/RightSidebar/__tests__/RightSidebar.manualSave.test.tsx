import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import type { CustomizeFieldsDtoInput } from '@/types/contracts/interview/CustomizeFields.dto.gen';
import type { CustomizeFieldsResult } from '@/lib/services/interview.service';
import type { ITable } from '../../../types/RightSidebarTypes';

// W6 emenda — FE-INCR-W6-MANUAL-SESSION (BRIEF WIZARD-W6-MANUAL-SESSION itens 8–11; forks F-MS-1..4, dono 21/10):
// o "Salvar Alterações" do modo manual grava na sessão com {kind:'manual'}. `fetch` global, InterviewService real.
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
const bodyOf = (call: number): unknown => JSON.parse(String((fetchMock().mock.calls[call] as [string, RequestInit])[1].body));

const tabela: ITable = {
  key: 'clientes',
  name: 'Clientes',
  description: 'Cadastro de clientes',
  conversationHistory: [],
  fields: [
    { name: 'nome', label: 'Nome', type: 'string', required: true },
    { name: 'telefone', label: 'Telefone', type: 'string' },
  ],
};

const ok = (table: ITable): CustomizeFieldsResult => ({
  sessionId: 's1',
  tableKey: 'clientes',
  table: { ...table, conversationHistory: [] },
  conversationHistory: [],
  proposal: null,
  discarded: [],
  applied: true,
});

/** Faz o papel do `useAiInterview`: `onUpdateTable` troca a tabela selecionada. */
function montar(props: { onSessionLost?: () => void; sessionId?: string | null } = {}) {
  const onUpdateTable = vi.fn();
  function ComHook() {
    const [selecionada, setSelecionada] = useState<ITable>(tabela);
    return (
      <RightSidebar
        selectedTable={selecionada}
        isVisible
        sessionId={props.sessionId === undefined ? 's1' : props.sessionId}
        onUpdateTable={(t) => { onUpdateTable(t); setSelecionada(t); }}
        onSessionLost={props.onSessionLost}
        presetKey={null}
      />
    );
  }
  return { ...render(<ComHook />), onUpdateTable };
}

function adicionar(name: string, label: string, type = 'string') {
  fireEvent.click(screen.getByText('onboardingFieldsNewField'));
  fireEvent.change(document.getElementById('field-name')!, { target: { value: name } });
  fireEvent.change(document.getElementById('field-label')!, { target: { value: label } });
  fireEvent.change(document.getElementById('field-type')!, { target: { value: type } });
  fireEvent.click(screen.getByText('onboardingFieldsAdd'));
}
const salvar = () => screen.getByText('onboardingFieldsSave').closest('button')!;

describe('modo manual grava na sessão (W6 emenda)', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('item 8 (F-MS-2 a): o formulário não oferece Senha; e-mail vai como type string + format email', async () => {
    fetchMock().mockResolvedValue(res(200, ok(tabela)));
    montar();
    fireEvent.click(screen.getByText('onboardingFieldsNewField'));
    const opcoes = Array.from((document.getElementById('field-type') as HTMLSelectElement).options).map((o) => o.value);
    expect(opcoes).toEqual(['string', 'number', 'boolean', 'date', 'datetime', 'email', 'phone']);
    fireEvent.click(screen.getByText('onboardingFieldsCancel'));

    adicionar('email', 'E-mail', 'email');
    fireEvent.click(salvar());
    await waitFor(() => expect(fetchMock()).toHaveBeenCalledTimes(1));
    expect(bodyOf(0)).toMatchObject({ changes: [{ action: 'add', field: { name: 'email', label: 'E-mail', type: 'string', format: 'email', required: false } }] });
  });

  it('item 9: sem mudança o Salvar fica desabilitado; campo novo + visibilidade → um lote, e o hook recebe data.table', async () => {
    const doServidor: ITable = {
      ...tabela,
      fields: [tabela.fields![0], { ...tabela.fields![1], hidden: true }, { name: 'apelido', label: 'Apelido', type: 'string', required: false }],
    };
    fetchMock().mockResolvedValue(res(200, ok(doServidor)));
    const { onUpdateTable } = montar();
    expect(salvar()).toBeDisabled();

    adicionar('apelido', 'Apelido');
    fireEvent.click(document.getElementById('visible-field-1')!); // esconde Telefone
    fireEvent.click(salvar());

    await waitFor(() => expect(onUpdateTable).toHaveBeenCalledTimes(1));
    const esperado: CustomizeFieldsDtoInput = {
      kind: 'manual',
      sessionId: 's1',
      tableKey: 'clientes',
      changes: [
        { action: 'setHidden', name: 'telefone', hidden: true },
        { action: 'add', field: { name: 'apelido', label: 'Apelido', type: 'string', required: false } },
      ],
    };
    expect(bodyOf(0)).toEqual(esperado);
    expect(onUpdateTable).toHaveBeenCalledWith(expect.objectContaining({ fields: doServidor.fields }));
    expect(await screen.findByText('onboardingFieldsSaved')).toBeInTheDocument();
    expect(salvar()).toBeDisabled(); // o hook tem a tabela do servidor: nada pendente
  });

  it('item 10: INTERVIEW_SESSION_NOT_FOUND → mensagem de sessão e a entrevista volta à escolha', async () => {
    fetchMock().mockResolvedValue(res(404, { code: 'INTERVIEW_SESSION_NOT_FOUND', message: 'x' }));
    const onSessionLost = vi.fn();
    montar({ onSessionLost });
    adicionar('apelido', 'Apelido');
    fireEvent.click(salvar());
    expect((await screen.findByTestId('manual-save-error')).textContent).toContain('onboardingFieldsAiSessionLost');
    expect(onSessionLost).toHaveBeenCalledTimes(1);
  });

  it('item 10: MANUAL_CHANGE_INVALID → um motivo por campo, e a edição fica na tela', async () => {
    fetchMock().mockResolvedValue(res(400, {
      code: 'MANUAL_CHANGE_INVALID',
      message: 'x',
      details: { changes: [{ index: 0, name: 'id', reason: 'reserved' }, { index: 1, name: 'b', reason: 'duplicate' }] },
    }));
    const { onUpdateTable } = montar();
    adicionar('id', 'Id');
    fireEvent.click(salvar());
    const erro = await screen.findByTestId('manual-save-error');
    expect(erro.textContent).toContain('onboardingFieldsManualInvalid');
    expect(erro.textContent).toContain('id: onboardingFieldsAiDiscardedReserved');
    expect(erro.textContent).toContain('b: onboardingFieldsManualDuplicate');
    expect(onUpdateTable).not.toHaveBeenCalled();
    expect(screen.getByText('Id')).toBeInTheDocument();
    expect(salvar()).not.toBeDisabled();
  });

  it('item 10: INTERVIEW_SESSION_CONFLICT → aviso de outra aba; outro código → genérico', async () => {
    fetchMock()
      .mockResolvedValueOnce(res(409, { code: 'INTERVIEW_SESSION_CONFLICT', message: 'x' }))
      .mockResolvedValueOnce(res(500, { code: 'INTERNAL_SERVER_ERROR', message: 'x' }));
    montar();
    adicionar('apelido', 'Apelido');
    fireEvent.click(salvar());
    expect((await screen.findByTestId('manual-save-error')).textContent).toContain('onboardingFieldsManualConflict');
    fireEvent.click(salvar());
    await waitFor(() => expect(screen.getByTestId('manual-save-error').textContent).toContain('onboardingFieldsManualSaveFailed'));
  });

  it('item 11 (F-MS-3 a; revisão do #786 → o servidor decide): o 400 diz os campos sensíveis; selo e ciência aparecem, e o 2º Salvar leva acknowledgeSensitive:true', async () => {
    fetchMock()
      .mockResolvedValueOnce(res(400, { code: 'SENSITIVE_FIELD_NOT_ACKNOWLEDGED', message: 'x', details: { fields: ['alergias'] } }))
      .mockResolvedValueOnce(res(200, ok(tabela)));
    const { onUpdateTable } = montar();
    adicionar('alergias', 'Alergias');
    expect(screen.queryByTestId('manual-sensitive')).toBeNull(); // o front não adivinha: quem decide é o servidor
    fireEvent.click(salvar());

    const bloco = await screen.findByTestId('manual-sensitive');
    expect(bloco.textContent).toContain('onboardingFieldsAiSensitiveBadge');
    expect(bloco.textContent).toContain('Alergias');
    expect(bloco.textContent).toContain('onboardingFieldsAiSensitiveNotice');
    expect(screen.queryByTestId('manual-save-error')).toBeNull();
    expect(onUpdateTable).not.toHaveBeenCalled();
    expect(salvar()).toBeDisabled();

    fireEvent.click(screen.getByLabelText('onboardingFieldsAiSensitiveAck'));
    expect(salvar()).not.toBeDisabled();
    fireEvent.click(salvar());
    await waitFor(() => expect(fetchMock()).toHaveBeenCalledTimes(2));
    expect(bodyOf(0)).not.toHaveProperty('acknowledgeSensitive');
    expect(bodyOf(1)).toMatchObject({ kind: 'manual', acknowledgeSensitive: true });
  });

  it('item 11: sem campo sensível, o corpo não leva acknowledgeSensitive', async () => {
    fetchMock().mockResolvedValue(res(200, ok(tabela)));
    montar();
    adicionar('apelido', 'Apelido');
    expect(screen.queryByTestId('manual-sensitive')).toBeNull();
    fireEvent.click(salvar());
    await waitFor(() => expect(fetchMock()).toHaveBeenCalledTimes(1));
    expect(bodyOf(0)).not.toHaveProperty('acknowledgeSensitive');
  });
});

// Revisão do #786 (dono, chat e questionário, 2026-10-21: "Corrige todos, nos PRs certos").
describe('modo manual — revisão do #786', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('Adicionar fica desabilitado com nome ou rótulo em branco', () => {
    montar();
    fireEvent.click(screen.getByText('onboardingFieldsNewField'));
    const adicionarBtn = () => screen.getByText('onboardingFieldsAdd').closest('button')!;
    expect(adicionarBtn()).toBeDisabled();
    fireEvent.change(document.getElementById('field-name')!, { target: { value: 'apelido' } });
    fireEvent.change(document.getElementById('field-label')!, { target: { value: '   ' } });
    expect(adicionarBtn()).toBeDisabled();
    fireEvent.change(document.getElementById('field-label')!, { target: { value: 'Apelido' } });
    expect(adicionarBtn()).not.toBeDisabled();
  });

  it('campo obrigatório não pode ser escondido: a caixa Visível fica desabilitada', () => {
    montar();
    expect(document.getElementById('visible-field-0')).toBeDisabled(); // nome (required)
    expect(document.getElementById('visible-field-1')).not.toBeDisabled(); // telefone
  });

  it('turno da IA no meio não esconde do Salvar a edição manual pendente', async () => {
    fetchMock()
      .mockResolvedValueOnce(res(200, { ...ok(tabela), applied: undefined }))
      .mockResolvedValueOnce(res(200, ok(tabela)));
    montar();
    adicionar('apelido', 'Apelido');
    fireEvent.click(screen.getByText('onboardingFieldsModeAi'));
    const caixa = screen.getByPlaceholderText('onboardingFieldsAiInputPlaceholder');
    fireEvent.change(caixa, { target: { value: 'oi' } });
    fireEvent.keyDown(caixa, { key: 'Enter' });
    await waitFor(() => expect(fetchMock()).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('onboardingFieldsModeManual'));
    expect(salvar()).not.toBeDisabled();
    fireEvent.click(salvar());
    await waitFor(() => expect(fetchMock()).toHaveBeenCalledTimes(2));
    expect(bodyOf(1)).toMatchObject({ kind: 'manual', changes: [{ action: 'add', field: { name: 'apelido' } }] });
  });
});
