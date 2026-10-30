import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The panel does not `import React` — expose it globally for the render (my-app/CLAUDE.md).
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { AccountsPayablePanel } from '../AccountsPayablePanel';
import {
  accountsPayableService,
  type PayableStatus,
  type PayableWithPayments,
} from '../../../../lib/services/accountsPayable.service';
import { counterpartiesService } from '../../../../lib/services/counterparties.service';

vi.mock('../../../../lib/services/accountsPayable.service', () => ({
  accountsPayableService: {
    listPayables: vi.fn(),
    createPayable: vi.fn(),
    registerPayment: vi.fn(),
    cancelPayable: vi.fn(),
    cancelPayment: vi.fn(),
  },
  PAYMENT_METHODS: ['Cash', 'Pix', 'TED', 'Boleto'],
}));

vi.mock('../../../../lib/services/counterparties.service', () => ({
  counterpartiesService: { listCounterparties: vi.fn() },
}));

const openPayable: PayableWithPayments = {
  id: 'ap1', userId: 'o1', unitId: 'u1', supplierName: 'Fornecedor X', supplierRef: null, counterpartyId: null,
  documentNumber: 'NF-1', description: 'Aluguel', issueDate: '2026-06-01', dueDate: '2026-06-10',
  amountCents: 150000, expenseAccountId: 'acc1', inventoryProductRef: null, inventoryQty: null,
  status: 'OPEN', createdById: 'o1',
  cancelledById: null, cancelReason: null, createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z', deletedAt: null, payments: [],
};

// Achado (G) do H2 (RUNBOOK-H2-BROWSER-SIGNOFF passo 15, execução 29/10, build de produção de 455c1a45):
// o select de forma de pagamento mostra "Cash" em pt e a lista mostra o status "PARTIALLY_PAID" cru.
// Teste-guarda: VERMELHO até a sessão de correção. Autorização: dono em chat 29/10 ("Pode disparar uma
// sessão de correção"; instrumentação antes, escolha "As duas").
describe('AccountsPayablePanel — rótulos em pt (achado G do H2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(counterpartiesService.listCounterparties).mockResolvedValue([]);
  });

  it('G1: a opção "Cash" do select de forma de pagamento aparece traduzida ("Dinheiro"), não como o enum cru', async () => {
    vi.mocked(accountsPayableService.listPayables).mockResolvedValue({ payables: [openPayable], total: 1 });

    render(<AccountsPayablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Fornecedor X')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Pagar/ }));

    // Sanidade do setup: o modal de pagamento abriu com o select de forma.
    expect(screen.getByText('Forma de pagamento')).toBeInTheDocument();
    const cashOption = document.querySelector('option[value="Cash"]');
    expect(cashOption, 'o select de forma de pagamento deve ter a opção de valor "Cash"').not.toBeNull();
    expect(
      cashOption?.textContent,
      'em pt o rótulo da forma "Cash" deve ser "Dinheiro" (precedente: public/locales/pt/database.json "Cash": "Dinheiro")',
    ).toBe('Dinheiro');
  });

  it('G3: uma conta PARTIALLY_PAID mostra o status em pt na lista, não o enum cru', async () => {
    // O servidor devolve PARTIALLY_PAID (server/src/features/accounting/models/Payable.model.ts:19), mas o
    // tipo do FE (lib/services/accountsPayable.service.ts:27) não tem o valor — o cast é a própria lacuna.
    const partiallyPaid: PayableWithPayments = {
      ...openPayable, id: 'ap3', supplierName: 'Fornecedor Parcial',
      status: 'PARTIALLY_PAID' as unknown as PayableStatus,
    };
    vi.mocked(accountsPayableService.listPayables).mockResolvedValue({ payables: [partiallyPaid], total: 1 });

    const { container } = render(<AccountsPayablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Fornecedor Parcial')).toBeInTheDocument());

    expect(
      container.textContent,
      'a lista de Contas a Pagar não pode mostrar o enum "PARTIALLY_PAID" cru — falta o rótulo pt do status',
    ).not.toContain('PARTIALLY_PAID');
  });

  // Achado da correção do G (PR #988, 29/10): o servidor também devolve DEFERRED — título de imposto < R$ 10
  // somado ao da competência seguinte (Payable.model.ts:17-19) —, e o tipo do FE não o tem. Teste-guarda:
  // VERMELHO até o fix. Autorização: dono em chat 29/10 ("Corrige").
  it('G4: uma conta DEFERRED mostra o status em pt na lista, não o enum cru', async () => {
    const deferred: PayableWithPayments = {
      ...openPayable, id: 'ap4', supplierName: 'Fornecedor Adiado',
      status: 'DEFERRED' as unknown as PayableStatus,
    };
    vi.mocked(accountsPayableService.listPayables).mockResolvedValue({ payables: [deferred], total: 1 });

    const { container } = render(<AccountsPayablePanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Fornecedor Adiado')).toBeInTheDocument());

    expect(
      container.textContent,
      'a lista de Contas a Pagar não pode mostrar o enum "DEFERRED" cru — falta o rótulo pt do status',
    ).not.toContain('DEFERRED');
  });
});
