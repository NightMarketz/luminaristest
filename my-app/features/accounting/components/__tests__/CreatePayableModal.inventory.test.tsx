import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { CreatePayableModal } from '../CreatePayableModal';
import { accountsPayableService } from '../../../../lib/services/accountsPayable.service';
import { DynamicTableService } from '../../../../lib/services/dynamic-table.service';
import type { Account } from '../../../../lib/services/accounting.service';

/**
 * FE-INCR-PURCHASE-VALUATION (LAC-D) — o braço de inventário do CreatePayableModal.
 * Guarda central: o payload do modo estoque carrega inventoryProductRef+inventoryQty e
 * NUNCA expenseAccountId (o XOR `.strict()` do servidor rejeita par misto); o modo despesa
 * segue intocado. No código antigo, o tipo do payload nem expressava a compra — este arquivo
 * não compilava.
 */

vi.mock('../../../../lib/services/accountsPayable.service', () => ({
  accountsPayableService: { createPayable: vi.fn(async () => ({ id: 'pay-1' })) },
}));
vi.mock('../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: {
    getTables: vi.fn(async () => ({
      data: [{ id: 'tbl-products', internalName: 'products', name: 'Products' }],
    })),
    getTableData: vi.fn(async () => ({
      data: [
        { id: 'prod-1', data: { name: 'Shampoo Profissional' } },
        { id: 'prod-2', data: { name: 'Condicionador' } },
      ],
    })),
  },
}));

const expenseAccounts: Account[] = [
  { id: 'e1', code: '4.1.1', name: 'Aluguel', nature: 'Expense', acceptsEntries: true } as Account,
];

function renderModal() {
  render(
    <CreatePayableModal
      isOpen
      onClose={() => {}}
      unitId="u1"
      expenseAccounts={expenseAccounts}
      onSuccess={() => {}}
    />,
  );
}

function fillCommonFields() {
  fireEvent.change(screen.getByPlaceholderText('Nome do fornecedor…'), { target: { value: 'Distribuidora' } });
  fireEvent.change(screen.getByPlaceholderText('Ex.: aluguel, energia, insumos…'), { target: { value: 'Compra de shampoo' } });
  fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '300,00' } });
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CreatePayableModal — braço de inventário (XOR)', () => {
  it('modo estoque envia inventoryProductRef+inventoryQty e NUNCA expenseAccountId', async () => {
    renderModal();
    fillCommonFields();

    fireEvent.click(screen.getByRole('radio', { name: 'Compra de estoque' }));
    // Catálogo carregado sob demanda via DynamicTableService.
    await waitFor(() => expect(screen.getByText('Shampoo Profissional')).toBeInTheDocument());

    const selects = screen.getAllByRole('combobox');
    const productSelect = selects.find((s) => s.querySelector('option[value="prod-1"]'))!;
    fireEvent.change(productSelect, { target: { value: 'prod-1' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '10' } });

    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(accountsPayableService.createPayable).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(accountsPayableService.createPayable).mock.calls[0][0];
    expect(payload).toMatchObject({
      unitId: 'u1',
      amountCents: 30000,
      inventoryProductRef: 'prod-1',
      inventoryQty: 10,
    });
    expect('expenseAccountId' in payload).toBe(false);
  });

  it('voltar ao modo despesa limpa o braço de inventário (par meio-preenchido inalcançável)', async () => {
    renderModal();
    fillCommonFields();

    fireEvent.click(screen.getByRole('radio', { name: 'Compra de estoque' }));
    await waitFor(() => expect(screen.getByText('Shampoo Profissional')).toBeInTheDocument());
    const selects = screen.getAllByRole('combobox');
    const productSelect = selects.find((s) => s.querySelector('option[value="prod-1"]'))!;
    fireEvent.change(productSelect, { target: { value: 'prod-1' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '5' } });

    fireEvent.click(screen.getByRole('radio', { name: 'Despesa' }));
    const accountSelect = screen
      .getAllByRole('combobox')
      .find((s) => s.querySelector('option[value="e1"]'))!;
    fireEvent.change(accountSelect, { target: { value: 'e1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(accountsPayableService.createPayable).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(accountsPayableService.createPayable).mock.calls[0][0];
    expect(payload).toMatchObject({ expenseAccountId: 'e1' });
    expect('inventoryProductRef' in payload).toBe(false);
    expect('inventoryQty' in payload).toBe(false);
  });

  it('modo estoque sem produto/quantidade mantém Registrar desabilitado', () => {
    renderModal();
    fillCommonFields();
    fireEvent.click(screen.getByRole('radio', { name: 'Compra de estoque' }));
    expect(screen.getByRole('button', { name: 'Registrar' })).toHaveProperty('disabled', true);
  });
});

describe('CreatePayableModal — deep link do MovementModal (initialInventory)', () => {
  it('abre no braço estoque com produto e quantidade do link; o payload leva os dois', async () => {
    render(
      <CreatePayableModal
        isOpen
        onClose={() => {}}
        unitId="u1"
        expenseAccounts={expenseAccounts}
        onSuccess={() => {}}
        initialInventory={{ productRef: 'prod-2', qty: 4 }}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Compra de estoque' })).toHaveAttribute('aria-checked', 'true');
    await waitFor(() => expect(screen.getByText('Condicionador')).toBeInTheDocument());
    expect(screen.getByPlaceholderText('0')).toHaveProperty('value', '4');

    fillCommonFields();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(accountsPayableService.createPayable).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(accountsPayableService.createPayable).mock.calls[0][0];
    expect(payload.inventoryProductRef).toBe('prod-2');
    expect(payload.inventoryQty).toBe(4);
    expect(payload).not.toHaveProperty('expenseAccountId');
  });
});

// Achado (C) do runbook H2 (29/10): a dica dizia "Debita 1.1.6 Estoques", mas a compra lança em 1.1.3.01
// (ESTOQUES_CODE do plano do servidor; o 1.1.6 foi renumerado). A dica tem de nomear a conta que o razão mostra.
describe('CreatePayableModal — dica do modo estoque nomeia a conta real', () => {
  it('o default e os dois locales citam 1.1.3.01, nunca 1.1.6', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('radio', { name: 'Compra de estoque' }));
    expect(screen.getByText(/Debita 1\.1\.3\.01 Estoques/)).toBeInTheDocument();

    const fs = await import('node:fs');
    const path = await import('node:path');
    for (const lng of ['pt', 'en']) {
      const json = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../../public/locales/${lng}/accounting.json`), 'utf8'));
      const hint: string = json.contasAPagar.createModal.mode.inventoryHint;
      expect({ lng, hint: hint.includes('1.1.3.01') && !hint.includes('1.1.6') }).toEqual({ lng, hint: true });
    }
  });
});
