import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import DashboardTabsBar from '../DashboardTabsBar';
import type { DashboardLayout } from '../types/dashboard-grid.types';

(globalThis as unknown as { React: typeof React }).React = React;

// L-20261113-152227-9190: excluir aba apagava num clique (sem confirmar), o botão só aparecia no hover e a troca/renomeação
// era <div onClick>. Guarda: excluir pede confirmação; abas são botões (teclado); excluir e criar têm nome acessível.

const layouts = [
  { id: 'a', name: 'Principal' },
  { id: 'b', name: 'Vendas' },
] as unknown as DashboardLayout[];

function setup() {
  const props = { onSwitch: vi.fn(), onCreate: vi.fn(), onRename: vi.fn(), onDelete: vi.fn() };
  render(<DashboardTabsBar layouts={layouts} activeLayoutId="a" {...props} />);
  return props;
}

afterEach(() => cleanup());

describe('DashboardTabsBar — a11y e exclusão confirmada', () => {
  it('excluir só chama onDelete depois de confirmar', async () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: /Excluir aba Vendas/ }));
    expect(p.onDelete).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(p.onDelete).toHaveBeenCalledWith('b'));
  });

  it('cancelar não exclui', async () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: /Excluir aba Vendas/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(p.onDelete).not.toHaveBeenCalled();
  });

  it('abas são botões com role=tab e trocam por clique/Enter nativo', () => {
    const p = setup();
    const tab = screen.getByRole('tab', { name: 'Vendas' });
    expect(tab.tagName).toBe('BUTTON');
    fireEvent.click(tab);
    expect(p.onSwitch).toHaveBeenCalledWith('b');
  });

  it('F2 na aba abre a edição do nome', () => {
    setup();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Vendas' }), { key: 'F2' });
    expect(screen.getByLabelText('Nome da aba')).toBeInTheDocument();
  });

  it('botão de nova aba tem nome acessível', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Nova aba' })).toBeInTheDocument();
  });
});
