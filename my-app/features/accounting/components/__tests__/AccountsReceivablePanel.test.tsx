import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// This panel compiles JSX to bare `React.createElement` (esbuild classic runtime)
// and does not `import React` — expose it globally for the render, like the
// AccountsPayablePanel test.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { AccountsReceivablePanel } from '../AccountsReceivablePanel';
import {
  accountsReceivableService,
  type ReceivableWithReceipts,
} from '../../../../lib/services/accountsReceivable.service';
import { counterpartiesService } from '../../../../lib/services/counterparties.service';

vi.mock('../../../../lib/services/accountsReceivable.service', () => ({
  accountsReceivableService: {
    listReceivables: vi.fn(),
    createReceivable: vi.fn(),
    registerReceipt: vi.fn(),
    cancelReceivable: vi.fn(),
    cancelReceipt: vi.fn(),
  },
  RECEIPT_METHODS: ['Cash', 'Pix', 'TED', 'Boleto'],
}));

// The filter bar's counterparty select is fed by the same fetch the create modal
// uses — mock it so the panel never fires a real network call on mount.
vi.mock('../../../../lib/services/counterparties.service', () => ({
  counterpartiesService: {
    listCounterparties: vi.fn(),
  },
}));

const customerOptions = [
  {
    id: 'cp1', userId: 'o1', unitId: 'u1', type: 'CUSTOMER' as const, name: 'Cliente A',
    ref: null, createdById: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
  },
];

const openReceivable: ReceivableWithReceipts = {
  id: 'ar1', userId: 'o1', unitId: 'u1', customerName: 'Cliente X', customerRef: null,
  documentNumber: 'NF-1', description: 'Serviço', issueDate: '2026-06-01', dueDate: '2026-06-10',
  amountCents: 150000, revenueAccountId: 'acc1', status: 'OPEN', createdById: 'o1',
  cancelledById: null, cancelReason: null, createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z', deletedAt: null, receipts: [],
};

const receivedReceivable: ReceivableWithReceipts = {
  ...openReceivable, id: 'ar2', customerName: 'Cliente Y', documentNumber: 'NF-2',
  description: 'Venda', status: 'RECEIVED',
  receipts: [{
    id: 'rec1', userId: 'o1', unitId: 'u1', receivableId: 'ar2', amountCents: 150000, method: 'Pix',
    receivedAt: '2026-06-05', receivedByUserId: 'o1', status: 'ACTIVE', entryId: 'e9',
    createdAt: '2026-06-05T00:00:00Z', updatedAt: '2026-06-05T00:00:00Z',
  }],
};

describe('AccountsReceivablePanel (render)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(counterpartiesService.listCounterparties).mockResolvedValue(customerOptions);
  });

  it('shows the empty state when there are no receivables', async () => {
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({ receivables: [], total: 0 });

    render(<AccountsReceivablePanel unitId="u1" />);

    await waitFor(() => expect(screen.getByText(/Nenhuma conta a receber registrada/)).toBeInTheDocument());
    // Guarda da classe `t`-instável — ver features/accounting/lib/useAccountingT.
    expect(accountsReceivableService.listReceivables).toHaveBeenCalledTimes(1);
  });

  it('renders an OPEN receivable with receive + cancel actions and no NaN money', async () => {
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({ receivables: [openReceivable], total: 1 });

    const { container } = render(<AccountsReceivablePanel unitId="u1" />);

    await waitFor(() => expect(screen.getByText('Cliente X')).toBeInTheDocument());
    expect(screen.getByText('Em aberto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Receber/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelar/ })).toBeInTheDocument();
    expect(container.textContent).toContain('1.500,00');
    expect(container.textContent).not.toContain('NaN');
  });

  it('renders a RECEIVED receivable with an undo-receipt action', async () => {
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({ receivables: [receivedReceivable], total: 1 });

    render(<AccountsReceivablePanel unitId="u1" />);

    await waitFor(() => expect(screen.getByText('Cliente Y')).toBeInTheDocument());
    expect(screen.getByText('Recebida')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Desfazer recebimento/ })).toBeInTheDocument();
  });

  it('renders the SubledgerFilterBar and refetches with combined filters (counterpartyId + dueFrom + overdue)', async () => {
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({ receivables: [], total: 0 });

    render(<AccountsReceivablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText(/Nenhuma conta a receber registrada/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Cliente A')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Contraparte'), { target: { value: 'cp1' } });
    fireEvent.change(screen.getByLabelText('Vencimento de'), { target: { value: '2026-06-01' } });
    fireEvent.click(screen.getByRole('checkbox'));

    await waitFor(() => {
      const calls = vi.mocked(accountsReceivableService.listReceivables).mock.calls;
      const last = calls[calls.length - 1][0];
      expect(last).toMatchObject({
        unitId: 'u1',
        counterpartyId: 'cp1',
        dueFrom: '2026-06-01',
        overdue: true,
      });
    });
  });

  it('overdue toggled off never sends overdue: false to the service', async () => {
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({ receivables: [], total: 0 });

    render(<AccountsReceivablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText(/Nenhuma conta a receber registrada/)).toBeInTheDocument());

    // Toggle on then off — the final call must omit `overdue` (undefined), never carry `false`.
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('checkbox'));

    await waitFor(() => {
      const calls = vi.mocked(accountsReceivableService.listReceivables).mock.calls;
      const last = calls[calls.length - 1][0] as { overdue?: boolean };
      expect(last.overdue).toBeUndefined();
      expect(last).not.toHaveProperty('overdue', false);
    });
  });
});
