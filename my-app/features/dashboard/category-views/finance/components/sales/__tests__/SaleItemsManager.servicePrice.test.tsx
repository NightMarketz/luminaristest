import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shim obrigatório (jsx "preserve" + runtime clássico) — nunca em código de produção.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SaleItemsManager } from '../create/SaleItemsManager';
import type { NewSaleItem } from '../../../types/sales.types';

/**
 * Achado (D) do runbook H2, passo 6 (29/10): escolher o serviço não trazia o preço do catálogo
 * (produto e pacote já traziam) — o operador digitava "8000" e gravava R$ 8.000,00.
 */

vi.mock('@/lib/context/CurrencyContext', () => ({
  useFormatCurrency: () => (v: number) => `R$ ${v.toFixed(2)}`,
}));
// RelationSelector: um <input> que devolve o valor digitado (o seletor real busca tabelas).
vi.mock('@/features/dashboard/components/forms/RelationSelector', () => ({
  default: ({ name, onChange }: { name: string; onChange: (n: string, v: string) => void }) => (
    <input data-testid={`rel-${name}`} onChange={(e) => onChange(name, e.target.value)} />
  ),
}));

const field = (name: string) => ({ name, label: name, type: 'relation', relation: { targetTable: `tbl-${name}` } });

function renderServices(servicePriceIndex?: Record<string, number>) {
  const onUpdateItem = vi.fn();
  render(
    <SaleItemsManager
      items={[{ id: 'tmp-1', quantity: 1, unitPrice: 0 } as NewSaleItem]}
      variant="services"
      unitId="u1"
      saleItemsFields={[field('serviceId')] as never}
      stockIndex={{}}
      servicePriceIndex={servicePriceIndex}
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

describe('SaleItemsManager — serviço traz o preço do catálogo', () => {
  it('escolher o serviço preenche unitPrice com o price do catálogo', () => {
    const onUpdateItem = renderServices({ svc1: 80 });
    fireEvent.change(screen.getByTestId('rel-serviceId'), { target: { value: 'svc1' } });
    expect(onUpdateItem).toHaveBeenCalledWith('tmp-1', { serviceId: 'svc1', unitPrice: 80 });
  });

  it('serviço sem preço no catálogo: só o serviceId (o operador digita o preço)', () => {
    const onUpdateItem = renderServices({});
    fireEvent.change(screen.getByTestId('rel-serviceId'), { target: { value: 'svc2' } });
    expect(onUpdateItem).toHaveBeenCalledWith('tmp-1', { serviceId: 'svc2' });
  });
});
