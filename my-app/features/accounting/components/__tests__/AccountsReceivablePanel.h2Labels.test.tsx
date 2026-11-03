import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The panel does not `import React` — expose it globally for the render (my-app/CLAUDE.md).
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { AccountsReceivablePanel } from '../AccountsReceivablePanel';
import {
  accountsReceivableService,
  type ReceivableWithReceipts,
} from '../../../../lib/services/accountsReceivable.service';
import { counterpartiesService } from '../../../../lib/services/counterparties.service';
import { paymentAccountsService } from '../../../../lib/services/paymentAccounts.service';

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

// O painel lê as contas do provedor no mount — sem rede no teste.
vi.mock('../../../../lib/services/paymentAccounts.service', () => ({
  paymentAccountsService: { list: vi.fn() },
}));

vi.mock('../../../../lib/services/counterparties.service', () => ({
  counterpartiesService: { listCounterparties: vi.fn() },
}));

const openReceivable: ReceivableWithReceipts = {
  id: 'ar1', userId: 'o1', unitId: 'u1', customerName: 'Cliente X', customerRef: null, counterpartyId: null,
  documentNumber: 'NF-1', description: 'Serviço', issueDate: '2026-06-01', dueDate: '2026-06-10',
  amountCents: 150000, revenueAccountId: 'acc1', status: 'OPEN', createdById: 'o1',
  cancelledById: null, cancelReason: null, createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z', deletedAt: null, receipts: [],
};

// Achado (G) do H2 (RUNBOOK-H2-BROWSER-SIGNOFF passo 15, execução 29/10, build de produção de 455c1a45):
// o select de forma de recebimento mostra "Cash" em pt.
// Teste-guarda: VERMELHO até a sessão de correção. Autorização: dono em chat 29/10 ("Pode disparar uma
// sessão de correção"; instrumentação antes, escolha "As duas").
describe('AccountsReceivablePanel — rótulos em pt (achado G do H2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(counterpartiesService.listCounterparties).mockResolvedValue([]);
    vi.mocked(paymentAccountsService.list).mockResolvedValue([]);
  });

  it('G2: a opção "Cash" do select de forma de recebimento aparece traduzida ("Dinheiro"), não como o enum cru', async () => {
    vi.mocked(accountsReceivableService.listReceivables).mockResolvedValue({ receivables: [openReceivable], total: 1 });

    render(<AccountsReceivablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Cliente X')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Receber/ }));

    // Sanidade do setup: o modal de recebimento abriu com o select de forma.
    expect(screen.getByText('Forma de recebimento')).toBeInTheDocument();
    const cashOption = document.querySelector('option[value="Cash"]');
    expect(cashOption, 'o select de forma de recebimento deve ter a opção de valor "Cash"').not.toBeNull();
    expect(
      cashOption?.textContent,
      'em pt o rótulo da forma "Cash" deve ser "Dinheiro" (precedente: public/locales/pt/database.json "Cash": "Dinheiro")',
    ).toBe('Dinheiro');
  });
});
