import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

// W7 PR-3 itens 10–11 (BRIEF `FE-INCR-WIZARD-HYGIENE`): o painel direito (modo manual, formulário de campo novo e
// modo IA) passa todo texto visível por t() — com o `t` devolvendo a chave, nenhum texto em português fixo sobra.
(globalThis as unknown as { React: typeof React }).React = React;
vi.mock('cookies-next', () => ({ getCookie: () => 'tok' }));
vi.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import RightSidebar from '../index';

// jsdom não implementa scrollIntoView (o modo IA rola para a última mensagem).
Element.prototype.scrollIntoView = vi.fn();

const PT_FIXO = [
  // 'Manual' fica fora: é igual em pt/en e casaria com a própria chave `onboardingFieldsModeManual`.
  'Customização', 'IA Humanizada', 'Núcleo', 'Novo Campo', 'Adicionar Novo Campo', 'não possui campos',
  'Salvar Alterações', 'Visível', 'Nome Técnico', 'Rótulo', 'Tipo de Dado', 'Texto', 'Número', 'Sim/Não', 'Data',
  'Senha', 'Telefone', 'Campo obrigatório', 'Cancelar', 'Adicionar', 'Ex:', 'Bem-vindo', 'Olá', 'Descreva',
  'Concluir Conversa',
];
const semPortuguesFixo = (container: HTMLElement) => {
  const texto = `${container.textContent ?? ''} ${Array.from(container.querySelectorAll('[aria-label],[placeholder]'))
    .map((el) => `${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('placeholder') ?? ''}`).join(' ')}`;
  for (const pt of PT_FIXO) expect(texto).not.toContain(pt);
};

const tabela = {
  key: 'clientes',
  name: 'Clientes',
  description: 'Cadastro de clientes',
  isCore: true,
  conversationHistory: [],
  fields: [{ name: 'nome', label: 'nome', type: 'string', required: true }],
};

describe('painel direito sem texto PT fixo (W7 itens 10–11)', () => {
  it('modo manual com o formulário de campo novo aberto', () => {
    const { container, getByText } = render(
      <RightSidebar selectedTable={tabela} isVisible sessionId={null} onUpdateTable={vi.fn()} presetKey="beautySalon" />,
    );
    fireEvent.click(getByText('onboardingFieldsNewField'));
    semPortuguesFixo(container);
    expect(container.textContent).toContain('onboardingFieldsCore');
    expect(container.textContent).toContain('onboardingFieldsVisible');
  });

  it('tabela sem campos mostra a chave do vazio', () => {
    const { container } = render(
      <RightSidebar selectedTable={{ ...tabela, fields: [] }} isVisible sessionId={null} onUpdateTable={vi.fn()} presetKey={null} />,
    );
    semPortuguesFixo(container);
    expect(container.textContent).toContain('onboardingFieldsEmpty');
  });

  it('modo IA', () => {
    const { container, getByText } = render(
      <RightSidebar selectedTable={tabela} isVisible sessionId={null} onUpdateTable={vi.fn()} presetKey={null} />,
    );
    fireEvent.click(getByText('onboardingFieldsModeAi'));
    semPortuguesFixo(container);
    expect(container.textContent).toContain('onboardingFieldsAiWelcome');
    expect(container.textContent).toContain('onboardingFieldsAiFinish');
  });
});
