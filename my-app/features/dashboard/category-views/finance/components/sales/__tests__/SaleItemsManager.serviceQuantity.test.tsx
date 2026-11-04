import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shim obrigatório (jsx "preserve" + runtime clássico) — nunca em código de produção.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SaleItemsManager } from '../create/SaleItemsManager';
import { toSaleItemPayload } from '../../../services/FinanceService';
import type { NewSaleItem } from '../../../types/sales.types';

/**
 * D-2026-11-04-VENDA-QUANTIDADE-SERVICO-E-PV-A §1 + emenda de 04/11 (dono, chat): serviço vendido com quantidade conta a
 * quantidade, e o modal Nova Venda expõe o campo para serviço como já faz para produto e pacote. Onde a venda aceita
 * pacote, serviço com quantidade ≥ 2 mostra só uma sugestão de pacote — o campo nunca é escondido nem convertido.
 */

vi.mock('@/lib/context/CurrencyContext', () => ({
  useFormatCurrency: () => (v: number) => `R$ ${v.toFixed(2)}`,
}));
vi.mock('@/features/dashboard/components/forms/RelationSelector', () => ({
  default: ({ name, onChange }: { name: string; onChange: (n: string, v: string) => void }) => (
    <input data-testid={`rel-${name}`} onChange={(e) => onChange(name, e.target.value)} />
  ),
}));

const field = (name: string) => ({ name, label: name, type: 'relation', relation: { targetTable: `tbl-${name}` } });

const PACKAGE_HINT = /venda como pacote/i;

function renderServices(item: Partial<NewSaleItem>, fields: string[] = ['serviceId']) {
  const onUpdateItem = vi.fn();
  render(
    <SaleItemsManager
      items={[{ id: 'tmp-1', itemType: 'Service', serviceId: 'svc1', ...item } as NewSaleItem]}
      variant="services"
      unitId="u1"
      saleItemsFields={fields.map(field) as never}
      stockIndex={{}}
      onAddItem={vi.fn()}
      onRemoveItem={vi.fn()}
      onUpdateItem={onUpdateItem}
      discountAmount={0}
      onDiscountChange={vi.fn()}
      subtotal={0}
      totalAmount={0}
      formatCurrency={(v) => `R$ ${v.toFixed(2)}`}
    />,
  );
  return onUpdateItem;
}

beforeEach(() => cleanup());

describe('SaleItemsManager — quantidade do serviço', () => {
  it('a linha de serviço tem o campo de quantidade e o valor digitado vai para o item', () => {
    const onUpdateItem = renderServices({ quantity: 1, unitPrice: 100 });
    expect(screen.getByRole('columnheader', { name: 'Qtd' })).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '2' } });
    expect(onUpdateItem).toHaveBeenCalledWith('tmp-1', { quantity: 2 });
  });

  it('serviço com qty 2 × 100 mostra total da linha 200 e grava quantity 2 no payload', () => {
    renderServices({ quantity: 2, unitPrice: 100 });
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(screen.getByText('R$ 200.00')).toBeInTheDocument();
    const payload = toSaleItemPayload('s1', { id: 'tmp-1', itemType: 'Service', serviceId: 'svc1', quantity: 2, unitPrice: 100 } as NewSaleItem);
    expect(payload.quantity).toBe(2);
    expect(payload.unitPrice).toBe(100);
  });

  it('onde a venda aceita pacote, qty ≥ 2 sugere pacote sem esconder o campo', () => {
    renderServices({ quantity: 2, unitPrice: 100 }, ['serviceId', 'packageId']);
    expect(screen.getByText(PACKAGE_HINT)).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
  });

  it('sem sugestão com qty 1, nem onde a venda não tem pacote', () => {
    renderServices({ quantity: 1, unitPrice: 100 }, ['serviceId', 'packageId']);
    expect(screen.queryByText(PACKAGE_HINT)).not.toBeInTheDocument();
    cleanup();
    renderServices({ quantity: 3, unitPrice: 100 }, ['serviceId']);
    expect(screen.queryByText(PACKAGE_HINT)).not.toBeInTheDocument();
  });
});
