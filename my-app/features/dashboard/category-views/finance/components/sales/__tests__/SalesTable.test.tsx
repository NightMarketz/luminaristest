import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shim obrigatório (jsx "preserve" + runtime clássico) — nunca em código de produção.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup } from '@testing-library/react';
import SalesTable from '../SalesTable';
import type { SaleRecord } from '../../../types/sales.types';

/**
 * Achado (A) do runbook H2, passo 10 (29/10): a linha da venda Devolvida ainda mostrava o botão
 * "Finalizar" — o gate de render só excluía Finalized e Cancelled. Finalizar é transição de Draft.
 */

vi.mock('@/lib/context/CurrencyContext', () => ({
  useFormatCurrency: () => (v: number) => `R$ ${v.toFixed(2)}`,
}));

function renderRow(status: string) {
  render(
    <SalesTable
      sales={[{ id: 'sale-1', date: '2026-10-29', status, paymentStatus: 'Pending', totalAmount: 80 } as SaleRecord]}
      saleIdToSubtotal={{}}
      customerNameMap={{}}
      onSelectSale={vi.fn()}
      onUpdateSale={vi.fn(async () => {})}
      onRequestPay={vi.fn()}
      onRequestCancel={vi.fn()}
      onRequestReturn={vi.fn()}
      onRefresh={vi.fn()}
    />,
  );
}

beforeEach(() => cleanup());

describe('SalesTable — gate de render do Finalizar', () => {
  it('Draft mostra Finalizar', () => {
    renderRow('Draft');
    expect(screen.getByTitle('Finalizar')).toBeTruthy();
  });

  it.each(['Finalized', 'Cancelled', 'Returned'])('%s não mostra Finalizar', (status) => {
    renderRow(status);
    expect(screen.queryByTitle('Finalizar')).toBeNull();
  });
});
