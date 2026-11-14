import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

import { AccountsPayablePanel } from '../AccountsPayablePanel';
import { RowExpandButton } from '../RowExpandButton';
import { accountsPayableService, type PayableWithPayments } from '../../../../lib/services/accountsPayable.service';
import { counterpartiesService } from '../../../../lib/services/counterparties.service';

/**
 * L-20261113-152225-ab0b: linhas expansíveis da contabilidade só abriam com mouse (<tr onClick>). Guarda: o botão
 * de expandir é focável, anuncia aria-expanded e abre/fecha por clique do botão sem duplo toggle com o <tr>.
 */
vi.mock('../../../../lib/services/accountsPayable.service', () => ({
  accountsPayableService: { listPayables: vi.fn(), createPayable: vi.fn(), registerPayment: vi.fn(), cancelPayable: vi.fn(), cancelPayment: vi.fn() },
  PAYMENT_METHODS: ['Cash', 'Pix', 'TED', 'Boleto'],
}));
vi.mock('../../../../lib/services/counterparties.service', () => ({ counterpartiesService: { listCounterparties: vi.fn() } }));

const paid: PayableWithPayments = {
  id: 'ap2', userId: 'o1', unitId: 'u1', supplierName: 'Fornecedor Y', supplierRef: null, counterpartyId: null,
  documentNumber: 'NF-2', description: 'Energia', issueDate: '2026-06-01', dueDate: '2026-06-10', amountCents: 150000,
  expenseAccountId: 'acc1', inventoryProductRef: null, inventoryQty: null, status: 'PAID', createdById: 'o1',
  cancelledById: null, cancelReason: null, createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z', deletedAt: null,
  remainingCents: 0,
  payments: [{
    id: 'pay1', userId: 'o1', unitId: 'u1', payableId: 'ap2', amountCents: 150000, method: 'Pix', kind: 'PAYMENT',
    paidAt: '2026-06-05', paidByUserId: 'o1', status: 'ACTIVE', entryId: 'e9',
    createdAt: '2026-06-05T00:00:00Z', updatedAt: '2026-06-05T00:00:00Z',
  }],
};

describe('RowExpandButton', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.mocked(counterpartiesService.listCounterparties).mockResolvedValue([]);
  });

  it('é <button> com aria-expanded e chama onToggle uma vez', () => {
    const onToggle = vi.fn();
    render(<RowExpandButton expanded={false} onToggle={onToggle} label="Expandir" />);
    const b = screen.getByRole('button', { name: 'Expandir' });
    expect(b).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(b);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('na tabela de contas a pagar, o botão da linha abre as baixas (teclado alcança a linha)', async () => {
    vi.mocked(accountsPayableService.listPayables).mockResolvedValue({ payables: [paid], total: 1 });
    render(<AccountsPayablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Fornecedor Y')).toBeInTheDocument());
    const b = screen.getByRole('button', { name: 'Expandir' });
    expect(b).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(b);
    expect(screen.getByRole('button', { name: 'Expandir' })).toHaveAttribute('aria-expanded', 'true');
  });
});
