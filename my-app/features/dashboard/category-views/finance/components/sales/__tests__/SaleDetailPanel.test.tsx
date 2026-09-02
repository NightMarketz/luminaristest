import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shim obrigatório (jsx "preserve" + runtime clássico) — nunca em código de produção.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import SaleDetailPanel from '../SaleDetailPanel';
import type { SaleRecord } from '../../../types/sales.types';

/**
 * TESTE-GUARDA da LAC-A (o 1º de category-views/finance): as ações Pagar/Cancelar/Devolver do
 * painel NÃO passam mais pelo PUT genérico (onUpdateSale) — sinalizam a intenção via
 * onRequestPay/Cancel/Return, que a SalesView roteia às rotas dedicadas /api/sales/*.
 * No código antigo, o clique em Pagar chamava onUpdateSale(id, {paymentStatus:'Paid'}) — que
 * bate no immutableAfter da venda Finalized e nunca posta o settlement. Este teste falha lá.
 */

vi.mock('@/lib/context/CurrencyContext', () => ({
  useFormatCurrency: () => (v: number) => `R$ ${v.toFixed(2)}`,
}));
vi.mock('@/features/dashboard/shared/hooks/useRenderTypedValue', () => ({
  useRenderTypedValue: () => (v: unknown) => String(v),
}));

function sale(over: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: 'sale-1',
    date: '2026-09-01',
    status: 'Finalized',
    paymentStatus: 'Pending',
    unitId: 'unit-1',
    customerId: 'cust-1',
    subtotal: 100,
    totalAmount: 100,
    ...over,
  } as SaleRecord;
}

function renderPanel(saleRecord: SaleRecord) {
  const onUpdateSale = vi.fn(async () => {});
  const onRequestPay = vi.fn();
  const onRequestCancel = vi.fn();
  const onRequestReturn = vi.fn();
  render(
    <SaleDetailPanel
      sale={saleRecord}
      table={null}
      items={[]}
      computedSubtotal={0}
      isUpdating={null}
      productNameMap={{}}
      serviceNameMap={{}}
      customerNameMap={{}}
      unitNameMap={{}}
      onUpdateSale={onUpdateSale}
      onRequestPay={onRequestPay}
      onRequestCancel={onRequestCancel}
      onRequestReturn={onRequestReturn}
    />,
  );
  return { onUpdateSale, onRequestPay, onRequestCancel, onRequestReturn };
}

beforeEach(() => cleanup());

describe('SaleDetailPanel — ações da venda vão às rotas dedicadas (LAC-A)', () => {
  it('Pagar em venda Finalized sinaliza onRequestPay e NUNCA chama o PUT genérico', () => {
    const { onUpdateSale, onRequestPay } = renderPanel(sale());
    fireEvent.click(screen.getByRole('button', { name: 'Pagar' }));
    expect(onRequestPay).toHaveBeenCalledTimes(1);
    expect(onRequestPay.mock.calls[0][0]).toMatchObject({ id: 'sale-1' });
    // A guarda central: o caminho antigo (patch {paymentStatus:'Paid'} via PUT) morreu.
    expect(onUpdateSale).not.toHaveBeenCalled();
  });

  it('Cancelar sinaliza onRequestCancel (roteamento Draft×Finalized é da SalesView)', () => {
    const { onUpdateSale, onRequestCancel } = renderPanel(sale());
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onRequestCancel).toHaveBeenCalledTimes(1);
    expect(onUpdateSale).not.toHaveBeenCalled();
  });

  it('Devolver existe para venda Finalized e sinaliza onRequestReturn', () => {
    const { onRequestReturn } = renderPanel(sale());
    fireEvent.click(screen.getByRole('button', { name: 'Devolver' }));
    expect(onRequestReturn).toHaveBeenCalledTimes(1);
  });

  it('gates de render: Draft NÃO mostra Pagar nem Devolver (o settlement do backend recusa Draft)', () => {
    renderPanel(sale({ status: 'Draft' }));
    expect(screen.queryByRole('button', { name: 'Pagar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Devolver' })).toBeNull();
    // Finalizar e Cancelar continuam disponíveis para Draft.
    expect(screen.getByRole('button', { name: 'Finalizar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
  });

  it('gates de render: venda Returned não mostra nenhuma ação de transição', () => {
    renderPanel(sale({ status: 'Returned', paymentStatus: 'Paid' }));
    expect(screen.queryByRole('button', { name: 'Pagar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Devolver' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();
  });
});
