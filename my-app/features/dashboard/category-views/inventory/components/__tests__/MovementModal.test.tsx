import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MovementModal } from '../MovementModal';

/**
 * LAC-D F-D1(a) — a entrada com motivo Compra é BLOQUEADA na tela de estoque: o custo digitado
 * aqui era coletado e descartado (nunca virava AP/razão/custo médio — receita-sem-CMV). O modal
 * agora aponta para Contas a Pagar e desabilita a confirmação; os demais motivos seguem normais.
 */

vi.mock('@/lib/context/CurrencyContext', () => ({
  useCurrency: () => ({ currency: 'BRL' }),
  SUPPORTED_CURRENCIES: [{ code: 'BRL', locale: 'pt-BR', symbol: 'R$' }],
}));
vi.mock('../../../components/forms/RelationSelector', () => ({
  default: () => <div data-testid="relation-selector" />,
}));

const row = {
  id: 'pu-1',
  data: { productId: 'prod-1', unitId: 'unit-1', productName: 'Shampoo', unitName: 'Matriz' },
};

function renderModal() {
  const onCreateMovement = vi.fn(async () => {});
  render(
    <MovementModal
      isOpen
      row={row}
      suppliersTableId="tbl-sup"
      onClose={() => {}}
      onCreateMovement={onCreateMovement}
      onSuccess={() => {}}
    />,
  );
  return { onCreateMovement };
}

beforeEach(() => cleanup());

describe('MovementModal — bloqueio da compra (LAC-D F-D1a)', () => {
  it('Entrada + Compra (default) mostra o aviso, o atalho para Contas a Pagar e desabilita Confirmar', () => {
    renderModal();
    expect(screen.getByText('Compra entra por Contas a Pagar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir Contas a Pagar' })).toHaveProperty(
      'pathname',
      '/accounting',
    );
    expect(screen.getByRole('button', { name: 'Confirmar Fluxo' })).toHaveProperty('disabled', true);
  });

  it('trocar o motivo para Ajuste destrava a confirmação e esconde o aviso', () => {
    renderModal();
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'Adjustment' } });
    expect(screen.queryByText('Compra entra por Contas a Pagar')).toBeNull();
    expect(screen.getByRole('button', { name: 'Confirmar Fluxo' })).toHaveProperty('disabled', false);
  });

  it('Saída com motivo Venda segue permitida (o bloqueio é só Entrada+Compra)', () => {
    renderModal();
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Out' } });
    fireEvent.change(selects[1], { target: { value: 'Sale' } });
    expect(screen.queryByText('Compra entra por Contas a Pagar')).toBeNull();
    expect(screen.getByRole('button', { name: 'Confirmar Fluxo' })).toHaveProperty('disabled', false);
  });
});
