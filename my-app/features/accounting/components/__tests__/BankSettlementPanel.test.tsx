import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { BankSettlementPanel, STATUS_TONE, actionsFor } from '../BankSettlementPanel';
import {
  BANK_SETTLEMENT_STATUSES,
  bankSettlementService,
  type BankSettlementItemView,
  type BankSettlementStatus,
} from '../../../../lib/services/bankSettlement.service';
import { accountingService } from '../../../../lib/services/accounting.service';

/**
 * FE-INCR-BANK-SETTLEMENT (BRIEF §1): default PENDING (F-FE-BS-3 → a); scan mostra o resumo; ações certas por
 * status (retry em FAILED e CONFIRMING, F-FE-BS-5 → a); confirmar manda `{ unitId, method }` e avisa o
 * balancete; o 400 nomeado do encargo aparece íntegro com o path; rejeitar exige motivo; 403 na lista esconde tudo.
 */
vi.mock('../../../../lib/services/bankSettlement.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/bankSettlement.service')>();
  return { ...actual, bankSettlementService: { list: vi.fn(), scan: vi.fn(), confirm: vi.fn(), reject: vi.fn(), retry: vi.fn() } };
});
vi.mock('../../../../lib/services/accounting.service', () => ({ accountingService: { listBankStatements: vi.fn() } }));

const item = (status: BankSettlementStatus, o: Partial<BankSettlementItemView> = {}): BankSettlementItemView => ({
  id: `b-${status}`, origin: 'STATEMENT_LINE', status, titleType: 'PAYABLE', titleId: 't1', proposedCents: 10000, chargeCents: 0,
  line: { id: 'l1', date: '2025-03-10', amountCents: -10000, description: 'PIX FORNECEDOR', externalRef: null },
  title: { openCents: 10000, dueDate: '2025-03-10', counterpartyName: 'Fornecedor A', status: 'OPEN' },
  settlementId: null, chargeEntryId: null, reason: null, failedStep: null, confirmedAt: null, ...o,
});
const statement = { id: 's1', userId: 'o', unitId: 'u1', glAccountId: 'g1', statementRef: 'EXT-03', periodStart: '2025-03-01', periodEnd: '2025-03-31', openingBalanceCents: null, closingBalanceCents: null, sha256: 'x', attachmentId: null, importedById: null, createdAt: '', updatedAt: '', deletedAt: null };

describe('BankSettlementPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(accountingService.listBankStatements).mockResolvedValue({ statements: [statement], total: 1 });
    vi.mocked(bankSettlementService.list).mockResolvedValue({ items: [item('PENDING')], total: 1, page: 1, limit: 20 });
  });

  it('status: toda cor e as ações por status (retry em FAILED e CONFIRMING; STALE/CONFIRMED/REJECTED sem ação)', () => {
    expect(Object.keys(STATUS_TONE).sort()).toEqual([...BANK_SETTLEMENT_STATUSES].sort());
    expect(actionsFor('PENDING')).toEqual(['confirm', 'reject']);
    expect(actionsFor('FAILED')).toEqual(['retry']);
    expect(actionsFor('CONFIRMING')).toEqual(['retry']);
    for (const s of ['STALE', 'CONFIRMED', 'REJECTED'] as const) expect(actionsFor(s)).toEqual([]);
  });

  it('lista o extrato mais recente com default PENDING; varrer mostra o resumo e recarrega', async () => {
    vi.mocked(bankSettlementService.scan).mockResolvedValue({ created: 2, skippedExisting: 1, ambiguous: 1, none: 3, stale: 0 });
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    await waitFor(() => expect(bankSettlementService.list).toHaveBeenCalledWith('u1', { statementId: 's1', status: 'PENDING', page: 1, limit: 20 }));
    fireEvent.click(screen.getByRole('button', { name: 'Varrer extrato' }));
    const s = await screen.findByTestId('bank-settlement-summary');
    expect(s.textContent).toMatch(/novos: 2.*já existentes: 1.*ambíguos: 1.*sem título: 3.*desatualizados: 0/);
    expect(bankSettlementService.list).toHaveBeenCalledTimes(2);
  });

  it('confirmar manda { unitId, method } e avisa o balancete', async () => {
    const onLedgerChange = vi.fn();
    vi.mocked(bankSettlementService.confirm).mockResolvedValue(item('CONFIRMED'));
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" onLedgerChange={onLedgerChange} />);
    fireEvent.click(within(await screen.findByTestId('settlement-b-PENDING')).getByRole('button', { name: 'Confirmar' }));
    fireEvent.change(screen.getByLabelText(/Meio de pagamento/), { target: { value: 'TED' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Confirmar' }).at(-1) as HTMLElement);
    await waitFor(() => expect(bankSettlementService.confirm).toHaveBeenCalledWith('b-PENDING', { unitId: 'u1', method: 'TED' }));
    await waitFor(() => expect(onLedgerChange).toHaveBeenCalled());
  });

  it('400 do encargo sem conta: mensagem íntegra + o path de configuração', async () => {
    vi.mocked(bankSettlementService.confirm).mockRejectedValue({ success: false, error: 'charge_account_not_configured: conta de encargo não configurada.', status: 400 });
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    fireEvent.click(within(await screen.findByTestId('settlement-b-PENDING')).getByRole('button', { name: 'Confirmar' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Confirmar' }).at(-1) as HTMLElement);
    expect(await screen.findByText(/charge_account_not_configured/)).toBeTruthy();
    expect(screen.getByText(/PUT \/api\/accounting\/settings/)).toBeTruthy();
  });

  it('rejeitar exige motivo e manda { unitId, reason }', async () => {
    vi.mocked(bankSettlementService.reject).mockResolvedValue(item('REJECTED'));
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    fireEvent.click(within(await screen.findByTestId('settlement-b-PENDING')).getByRole('button', { name: 'Rejeitar' }));
    const submit = screen.getAllByRole('button', { name: 'Rejeitar' }).at(-1) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'duplicado' } });
    fireEvent.click(submit);
    await waitFor(() => expect(bankSettlementService.reject).toHaveBeenCalledWith('b-PENDING', { unitId: 'u1', reason: 'duplicado' }));
  });

  it('403 na lista: só o aviso', async () => {
    vi.mocked(bankSettlementService.list).mockRejectedValue({ success: false, error: 'Sem permissão para ler as baixas.', status: 403 });
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    expect(await screen.findByText('Sem permissão para ler as baixas.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Varrer extrato' })).toBeNull();
  });
});
