import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// This panel compiles JSX to bare `React.createElement` (esbuild classic runtime)
// and does not `import React` — expose it globally for the render, like the
// AccountsPayablePanel test.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react';
import { AccountsReceivablePanel } from '../AccountsReceivablePanel';
import {
  accountsReceivableService,
  type ReceivableWithReceipts,
} from '../../../../lib/services/accountsReceivable.service';
import { counterpartiesService } from '../../../../lib/services/counterparties.service';
import { paymentAccountsService, type PaymentAccountView } from '../../../../lib/services/paymentAccounts.service';
import { collectionChargesService } from '../../../../lib/services/collectionCharges.service';

vi.mock('../../../../lib/services/accountsReceivable.service', () => ({
  accountsReceivableService: {
    listReceivables: vi.fn(),
    createReceivable: vi.fn(),
    registerReceipt: vi.fn(),
    cancelReceivable: vi.fn(),
    cancelReceipt: vi.fn(),
  },
  RECEIPT_METHODS: ['Cash', 'Pix', 'TED', 'Boleto'],
  CHARGEABLE_RECEIVABLE_STATUSES: ['OPEN', 'PARTIALLY_RECEIVED', 'RECEIVING'],
}));

// FE-INCR-PAYMENT-PROVIDER PR-2: o painel lê as contas do provedor no mount (item 20) e a sugestão do pagador ao
// clicar em "Cobrar" (item 13). O drawer e o modal (componentes reais) usam o mesmo serviço de cobrança mockado.
vi.mock('../../../../lib/services/paymentAccounts.service', () => ({
  paymentAccountsService: { list: vi.fn() },
}));
vi.mock('../../../../lib/services/collectionCharges.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/collectionCharges.service')>();
  return {
    ...actual,
    collectionChargesService: {
      create: vi.fn(),
      listByReceivable: vi.fn(),
      get: vi.fn(),
      cancel: vi.fn(),
      payerSuggestion: vi.fn(),
    },
  };
});

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
  id: 'ar1', userId: 'o1', unitId: 'u1', customerName: 'Cliente X', customerRef: null, counterpartyId: null,
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

const activeAccount: PaymentAccountView = {
  id: 'pa1', unitId: 'u1', provider: 'MERCADO_PAGO', label: 'MP', glAccountId: 'g1', providerAccountRef: null,
  config: { provider: 'MERCADO_PAGO', credentialSource: 'OWN' }, status: 'ACTIVE', credentialSetAt: '2026-10-01T00:00:00Z',
  credentialExpiresAt: null, accessTokenLast4: '1234', releaseReportBlockedReason: null,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
};

describe('AccountsReceivablePanel (render)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(counterpartiesService.listCounterparties).mockResolvedValue(customerOptions);
    vi.mocked(paymentAccountsService.list).mockResolvedValue([activeAccount]);
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

  it('paginates server-side (FRENTE 5): page 2 requests page=2, and a filter change resets to page 1', async () => {
    // total=60 > itemsPerPage(50) so StandardPagination renders and "Next" is enabled.
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({ receivables: [openReceivable], total: 60 });

    render(<AccountsReceivablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Cliente X')).toBeInTheDocument());
    expect(accountsReceivableService.listReceivables).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, limit: 50 }),
    );

    fireEvent.click(screen.getByTitle('Next'));
    await waitFor(() => {
      expect(accountsReceivableService.listReceivables).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });

    // A filter change on page 2 must not leave the user on a stale/empty page 2.
    fireEvent.change(screen.getByLabelText('Contraparte'), { target: { value: 'cp1' } });
    await waitFor(() => {
      expect(accountsReceivableService.listReceivables).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, counterpartyId: 'cp1' }),
      );
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

  // ── Teste-guarda (sessão de instrumentação 2026-09-01) — classe date-only UTC shift ──
  // Espelho do AccountsPayablePanel: `openAction` (AccountsReceivablePanel.tsx:306)
  // re-deriva `actionDate` com `today()` (`toISOString()`, UTC) no CLIQUE — entre
  // 21h-00h BRT o RECEBIMENTO default nasce datado do "amanhã" do escopo e grava o dia
  // errado em silêncio (write-path sem checagem de hoje). Comportamento correto
  // (fork-agnóstico): o default afirma o HOJE do escopo — ou vazio. Instante FIXADO só
  // em volta do clique (é aí que o default é derivado).
  it('guarda: default da data do recebimento na janela 21h-00h BRT é o hoje do escopo, não o amanhã UTC', async () => {
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({ receivables: [openReceivable], total: 1 });

    render(<AccountsReceivablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Cliente X')).toBeInTheDocument());

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-01T02:30:00Z')); // 23:30 BRT de 2026-08-31
      fireEvent.click(screen.getByRole('button', { name: /Receber/ }));

      const label = screen.getByText('Data do recebimento'); // sanidade: o modal abriu
      const input = label.parentElement?.querySelector('input[type="date"]') as HTMLInputElement;
      expect(
        ['', '2026-08-31'],
        'default de receivedAt às 23:30 BRT de 2026-08-31 deve afirmar o hoje do escopo (ou vazio) — 2026-09-01 é o "amanhã" UTC: o recebimento default grava a baixa no dia errado, em silêncio',
      ).toContain(input.value);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ── FE-INCR-PAYMENT-PROVIDER PR-2 — cobrança a partir do título (itens 11, 13, 16, 18–21) ──────────────────────
describe('AccountsReceivablePanel — cobrança por provedor', () => {
  const forbidden = Object.assign(new Error('Forbidden'), { status: 403 });

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(counterpartiesService.listCounterparties).mockResolvedValue(customerOptions);
    vi.mocked(paymentAccountsService.list).mockResolvedValue([activeAccount]);
    vi.mocked(collectionChargesService.payerSuggestion).mockResolvedValue({});
    vi.mocked(collectionChargesService.listByReceivable).mockResolvedValue([]);
  });

  const withStatus = (status: ReceivableWithReceipts['status'], id: string): ReceivableWithReceipts => ({
    ...openReceivable, id, customerName: `Cliente ${status}`, status,
  });

  it('item 11: "Cobrar" aparece em OPEN, PARTIALLY_RECEIVED e RECEIVING, e não em RECEIVED nem CANCELLED', async () => {
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({
      receivables: [
        withStatus('OPEN', 'r1'), withStatus('PARTIALLY_RECEIVED', 'r2'), withStatus('RECEIVING', 'r3'),
        withStatus('RECEIVED', 'r4'), withStatus('CANCELLED', 'r5'),
      ],
      total: 5,
    });
    render(<AccountsReceivablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Cliente OPEN')).toBeInTheDocument());
    const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;
    for (const st of ['OPEN', 'PARTIALLY_RECEIVED', 'RECEIVING']) {
      expect(within(rowOf(`Cliente ${st}`)).getByRole('button', { name: /^Cobrar$/ })).toBeInTheDocument();
    }
    for (const st of ['RECEIVED', 'CANCELLED']) {
      expect(within(rowOf(`Cliente ${st}`)).queryByRole('button', { name: /^Cobrar$/ })).toBeNull();
    }
    // Rótulo próprio do status novo no StatusBadge.
    expect(screen.getByText('Recebida em parte')).toBeInTheDocument();
  });

  it('item 20: sem conta ACTIVE ⇒ "Cobrar" desabilitado com dica; 403 na leitura das contas ⇒ habilitado', async () => {
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({ receivables: [openReceivable], total: 1 });
    vi.mocked(paymentAccountsService.list).mockResolvedValue([]);
    render(<AccountsReceivablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /^Cobrar$/ })).toBeDisabled());
    expect(screen.getByRole('button', { name: /^Cobrar$/ })).toHaveAttribute('title', expect.stringMatching(/aba Cobrança/));

    cleanup();
    vi.mocked(paymentAccountsService.list).mockRejectedValue(forbidden);
    render(<AccountsReceivablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Cliente X')).toBeInTheDocument());
    await waitFor(() => expect(paymentAccountsService.list).toHaveBeenCalledWith('u1', { silent: true }));
    expect(screen.getByRole('button', { name: /^Cobrar$/ })).toBeEnabled();
  });

  it('item 13: 403 na sugestão do pagador ⇒ o modal não abre e o botão some (quem só lê)', async () => {
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({ receivables: [openReceivable], total: 1 });
    vi.mocked(collectionChargesService.payerSuggestion).mockRejectedValue(forbidden);
    render(<AccountsReceivablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /^Cobrar$/ })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /^Cobrar$/ }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Cobrar$/ })).toBeNull());
    expect(screen.queryByText('Cobrar título')).toBeNull();
  });

  it('item 13: erro (não-403) na sugestão ⇒ abre com formulário vazio; sugestão preenche os campos', async () => {
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({ receivables: [openReceivable], total: 1 });
    vi.mocked(collectionChargesService.payerSuggestion).mockRejectedValue(Object.assign(new Error('x'), { status: 500 }));
    render(<AccountsReceivablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /^Cobrar$/ })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /^Cobrar$/ }));
    await waitFor(() => expect(screen.getByText('Cobrar título')).toBeInTheDocument());
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('');
    // Valor só leitura = saldo aberto (1.500,00), sem campo de valor.
    expect(screen.getByTestId('charge-amount')).toHaveTextContent('1.500,00');
  });

  it('item 16: "Cobranças" carrega a lista do título só ao abrir', async () => {
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({ receivables: [openReceivable], total: 1 });
    render(<AccountsReceivablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Cliente X')).toBeInTheDocument());
    expect(collectionChargesService.listByReceivable).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^Cobranças$/ }));
    await waitFor(() => expect(collectionChargesService.listByReceivable).toHaveBeenCalledWith('ar1', 'u1'));
    await waitFor(() => expect(screen.getByText('Nenhuma cobrança emitida para este título.')).toBeInTheDocument());
  });

  it('item 18: 409 receivable_has_live_charge no cancelamento ⇒ mensagem + atalho, sem fechar o modal', async () => {
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({ receivables: [openReceivable], total: 1 });
    vi.mocked(accountsReceivableService.cancelReceivable).mockRejectedValue(
      Object.assign(new Error('x'), { status: 409, code: 'receivable_has_live_charge', message: 'receivable_has_live_charge: ...' }),
    );
    render(<AccountsReceivablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Cliente X')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));
    await waitFor(() => expect(screen.getByText(/Cancele a cobrança do título antes/)).toBeInTheDocument());
    expect(screen.getByText('Cancelar conta a receber')).toBeInTheDocument(); // o modal segue aberto
    fireEvent.click(screen.getByRole('button', { name: 'Ver cobranças do título' }));
    await waitFor(() => expect(collectionChargesService.listByReceivable).toHaveBeenCalledWith('ar1', 'u1'));
  });

  it('item 19: o modal "Receber" continua com os 4 métodos — sem ProviderBalance', async () => {
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({ receivables: [openReceivable], total: 1 });
    render(<AccountsReceivablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Cliente X')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Receber/ }));
    const select = screen.getByText('Forma de recebimento').parentElement?.querySelector('select') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['Cash', 'Pix', 'TED', 'Boleto']);
  });

  it('item 21: emitir cobrança não chama onLedgerChange', async () => {
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({ receivables: [openReceivable], total: 1 });
    vi.mocked(collectionChargesService.create).mockResolvedValue({
      id: 'c1', unitId: 'u1', receivableId: 'ar1', paymentAccountId: 'pa1', kind: 'PIX', amountCents: '150000',
      expiresAt: '2026-10-24T00:00:00Z', status: 'PENDING', providerRef: 'o1', providerPaymentRef: null,
      providerStatus: 'action_required', providerStatusDetail: 'waiting_transfer', paidAt: null, failReason: null,
      instrument: { qrCode: 'pix-code' }, createdAt: '2026-10-23T00:00:00Z', updatedAt: '2026-10-23T00:00:00Z',
    });
    const onLedgerChange = vi.fn();
    render(<AccountsReceivablePanel unitId="u1" onLedgerChange={onLedgerChange} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /^Cobrar$/ })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /^Cobrar$/ }));
    await waitFor(() => expect(screen.getByText('Cobrar título')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Emitir cobrança' }));
    await waitFor(() => expect(screen.getByTestId('charge-result')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onLedgerChange).not.toHaveBeenCalled();
  });
});
