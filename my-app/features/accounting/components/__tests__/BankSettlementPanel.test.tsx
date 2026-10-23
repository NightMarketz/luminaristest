import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { BankSettlementPanel, STATUS_TONE, actionsFor } from '../BankSettlementPanel';
import {
  BANK_SETTLEMENT_STATUSES,
  bankSettlementService,
  feeCheck,
  methodsFor,
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
vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { listBankStatements: vi.fn(), getAccounts: vi.fn(), getSettings: vi.fn(), updateProviderFeeAccount: vi.fn() },
}));

const item = (status: BankSettlementStatus, o: Partial<BankSettlementItemView> = {}): BankSettlementItemView => ({
  id: `b-${status}`, origin: 'STATEMENT_LINE', status, titleType: 'PAYABLE', titleId: 't1', proposedCents: 10000, chargeCents: 0, feeCents: 0,
  line: { id: 'l1', date: '2025-03-10', amountCents: -10000, description: 'PIX FORNECEDOR', externalRef: null },
  title: { openCents: 10000, dueDate: '2025-03-10', counterpartyName: 'Fornecedor A', status: 'OPEN' },
  settlementId: null, chargeEntryId: null, feeEntryId: null, reason: null, failedStep: null, confirmedAt: null, ...o,
});
/** Item do extrato `mp_release`: líquido 9700, retido 300, título aberto 10000 (BRIEF #616 item 2). */
const feeItem = (status: BankSettlementStatus = 'PENDING', o: Partial<BankSettlementItemView> = {}) => item(status, {
  titleType: 'RECEIVABLE', feeCents: 300, line: { id: 'l2', date: '2025-03-10', amountCents: 9700, description: 'MP LIBERACAO', externalRef: null }, ...o,
});
const providerStatement = () => ({ ...statement, paymentAccountId: 'pa1' });
const confirmIn = async (id: string) => {
  fireEvent.click(within(await screen.findByTestId(`settlement-${id}`)).getByRole('button', { name: 'Confirmar' }));
  return screen.getByRole('dialog');
};
const statement = { id: 's1', userId: 'o', unitId: 'u1', glAccountId: 'g1', statementRef: 'EXT-03', periodStart: '2025-03-01', periodEnd: '2025-03-31', openingBalanceCents: null, closingBalanceCents: null, sha256: 'x', attachmentId: null, importedById: null, paymentAccountId: null, createdAt: '', updatedAt: '', deletedAt: null };

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

  it('feeCheck: bruto = |linha| + retido, conferido contra proposto + encargo; sem tarifa = null (EMENDA 1 item 12)', () => {
    const line = (amountCents: number) => ({ id: 'l', date: '2025-03-10', amountCents, description: '', externalRef: null });
    expect(feeCheck({ feeCents: 300, proposedCents: 10000, chargeCents: 0, line: line(9700) })).toEqual({ grossCents: 10000, consistent: true });
    expect(feeCheck({ feeCents: 300, proposedCents: 8000, chargeCents: 2000, line: line(9700) })).toEqual({ grossCents: 10000, consistent: true });
    expect(feeCheck({ feeCents: 300, proposedCents: 10000, chargeCents: 0, line: line(9600) })).toEqual({ grossCents: 9900, consistent: false });
    expect(feeCheck({ feeCents: 0, proposedCents: 10000, chargeCents: 0, line: line(-10000) })).toBeNull();
  });

  it('methodsFor: extrato de provedor só ProviderBalance; bancário, os 4 de hoje (item 11)', () => {
    expect(methodsFor({ paymentAccountId: 'pa1' })).toEqual(['ProviderBalance']);
    expect(methodsFor({ paymentAccountId: null })).toEqual(['Cash', 'Pix', 'TED', 'Boleto']);
    expect(methodsFor(null)).toEqual(['Cash', 'Pix', 'TED', 'Boleto']);
  });

  it('sem tarifa na página: nem coluna do retido nem seção da conta (regressão do extrato bancário)', async () => {
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    await screen.findByTestId('settlement-b-PENDING');
    expect(screen.queryByRole('columnheader', { name: 'Retido pelo provedor' })).toBeNull();
    expect(screen.queryByTestId('provider-fee-account-section')).toBeNull();
    expect(accountingService.getAccounts).not.toHaveBeenCalled();
    const dlg = await confirmIn('b-PENDING');
    expect(within(dlg).getAllByRole('option').map((o) => o.textContent)).toEqual(['Cash', 'Pix', 'TED', 'Boleto']);
    expect(within(dlg).queryByTestId('fee-check')).toBeNull();
  });

  it('retido > 0: coluna com retido e bruto; proposto e sem badge de encargo; modal com retido + ✓ (itens 2, 3, 12, 13)', async () => {
    vi.mocked(bankSettlementService.list).mockResolvedValue({ items: [feeItem(), item('CONFIRMED', { id: 'b-bank' })], total: 2, page: 1, limit: 20 });
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    const header = await screen.findByRole('columnheader', { name: 'Retido pelo provedor' });
    expect(header).toHaveAttribute('title', expect.stringMatching(/impostos retidos pelo provedor/));
    const cell = screen.getByTestId('fee-b-PENDING');
    expect(cell.textContent).toMatch(/R\$\s3,00/);
    expect(cell.textContent).toMatch(/bruto R\$\s100,00/);
    const row = screen.getByTestId('settlement-b-PENDING');
    expect(within(row).getAllByText(/R\$\s100,00/).length).toBeGreaterThan(0); // proposto
    expect(within(row).getAllByRole('cell')[5].textContent).toBe('—'); // Encargo: sem badge
    expect(screen.getByTestId('fee-b-bank').textContent).toBe('—');

    const dlg = await confirmIn('b-PENDING');
    expect(dlg.textContent).toMatch(/Retido pelo provedor R\$\s3,00/);
    expect(within(dlg).getByTestId('fee-check').textContent).toMatch(/bruto R\$\s100,00.*✓/);
  });

  it('conferência que não bate: ✗ e Confirmar continua habilitado (F-TAR-5 → a)', async () => {
    vi.mocked(bankSettlementService.list).mockResolvedValue({ items: [feeItem('PENDING', { proposedCents: 9000 })], total: 1, page: 1, limit: 20 });
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    const dlg = await confirmIn('b-PENDING');
    expect(within(dlg).getByTestId('fee-check').textContent).toMatch(/✗/);
    expect(within(dlg).getByRole('button', { name: 'Confirmar' })).not.toBeDisabled();
  });

  it('CONFIRMED com feeEntryId mostra "retido <id curto>" ao lado do encargo (itens 4, 13)', async () => {
    vi.mocked(bankSettlementService.list).mockResolvedValue({
      items: [feeItem('CONFIRMED', { settlementId: 'set12345xx', chargeEntryId: 'chg12345xx', feeEntryId: 'fee12345xx' })], total: 1, page: 1, limit: 20,
    });
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    expect(await screen.findByText('retido fee12345…')).toHaveAttribute('title', 'fee12345xx');
    expect(screen.getByText('encargo chg12345…')).toBeTruthy();
  });

  it('FAILED na etapa FEE aparece como os outros e oferece Reprocessar (item 14)', async () => {
    vi.mocked(bankSettlementService.list).mockResolvedValue({ items: [feeItem('FAILED', { failedStep: 'FEE', reason: 'falha no lançamento' })], total: 1, page: 1, limit: 20 });
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    const row = await screen.findByTestId('settlement-b-FAILED');
    expect(row.textContent).toMatch(/FEE — falha no lançamento/);
    expect(within(row).getByRole('button', { name: 'Reprocessar' })).toBeTruthy();
  });

  it('aviso G7: PENDING com reason mostra o texto do BE na lista e no modal, sem bloquear; sem reason, nada (item 10)', async () => {
    const reason = 'Cobrança em estado terminal no Luminaris (EXPIRED).';
    vi.mocked(bankSettlementService.list).mockResolvedValue({ items: [feeItem('PENDING', { reason }), item('PENDING', { id: 'b-plain' })], total: 2, page: 1, limit: 20 });
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    const row = await screen.findByTestId('settlement-b-PENDING');
    expect(within(row).getByRole('note').textContent).toBe(`Atenção — cobrança: ${reason}`);
    expect(within(screen.getByTestId('settlement-b-plain')).queryByRole('note')).toBeNull();
    const dlg = await confirmIn('b-PENDING');
    expect(within(dlg).getByRole('note').textContent).toContain(reason);
    expect(within(dlg).getByRole('button', { name: 'Confirmar' })).not.toBeDisabled();
  });

  it('extrato de provedor: o modal oferece só ProviderBalance, já selecionado, e o confirm o manda (item 11)', async () => {
    vi.mocked(accountingService.listBankStatements).mockResolvedValue({ statements: [providerStatement()], total: 1 });
    vi.mocked(accountingService.getAccounts).mockResolvedValue({ accounts: [] });
    vi.mocked(accountingService.getSettings).mockResolvedValue({ providerFeeExpenseAccountId: null } as never);
    vi.mocked(bankSettlementService.list).mockResolvedValue({ items: [feeItem()], total: 1, page: 1, limit: 20 });
    vi.mocked(bankSettlementService.confirm).mockResolvedValue(feeItem('CONFIRMED'));
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    const dlg = await confirmIn('b-PENDING');
    const select = within(dlg).getByLabelText(/Meio de pagamento/) as HTMLSelectElement;
    expect(select.value).toBe('ProviderBalance');
    expect(within(dlg).getAllByRole('option').map((o) => o.textContent)).toEqual(['ProviderBalance']);
    fireEvent.click(within(dlg).getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(bankSettlementService.confirm).toHaveBeenCalledWith('b-PENDING', { unitId: 'u1', method: 'ProviderBalance' }));
  });

  it('400 fee_account_not_configured: mensagem íntegra + dica apontando a seção (item 5)', async () => {
    vi.mocked(bankSettlementService.list).mockResolvedValue({ items: [feeItem()], total: 1, page: 1, limit: 20 });
    vi.mocked(bankSettlementService.confirm).mockRejectedValue({ success: false, error: 'fee_account_not_configured: conta de tarifa do provedor não configurada.', status: 400 });
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    const dlg = await confirmIn('b-PENDING');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Confirmar' }));
    expect(await within(dlg).findByText(/^fee_account_not_configured/)).toBeTruthy();
    expect(within(dlg).getByText(/no topo desta sub-aba/)).toBeTruthy();
  });

  it('400 provider_balance_requires_payment_account: mensagem traduzida (item 6)', async () => {
    vi.mocked(bankSettlementService.confirm).mockRejectedValue({ success: false, error: 'provider_balance_requires_payment_account: ProviderBalance só confirma recebimento em extrato de conta de provedor ACTIVE.', status: 400 });
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    const dlg = await confirmIn('b-PENDING');
    fireEvent.click(within(dlg).getByRole('button', { name: 'Confirmar' }));
    expect(await within(dlg).findByText(/não é de uma conta de provedor ativa/)).toBeTruthy();
  });

  it('seção da conta da tarifa: só em extrato de provedor; PUT parcial com SÓ unitId + providerFeeExpenseAccountId (item 7)', async () => {
    vi.mocked(accountingService.listBankStatements).mockResolvedValue({ statements: [providerStatement()], total: 1 });
    vi.mocked(accountingService.getAccounts).mockResolvedValue({
      accounts: [
        { id: 'a-tarifa', code: '4.5.1', name: 'Tarifas de provedor', nature: 'Expense', acceptsEntries: true },
        { id: 'a-sint', code: '4.5', name: 'Despesas financeiras', nature: 'Expense', acceptsEntries: false },
      ],
    });
    vi.mocked(accountingService.getSettings).mockResolvedValue({ providerFeeExpenseAccountId: null } as never);
    vi.mocked(accountingService.updateProviderFeeAccount).mockResolvedValue({} as never);
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    const section = await screen.findByTestId('provider-fee-account-section');
    const select = within(section).getByRole('combobox', { name: 'Conta da tarifa do provedor' });
    await waitFor(() => expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Selecione a conta…', '4.5.1 — Tarifas de provedor']));
    await waitFor(() => expect(within(section).getByRole('button', { name: 'Salvar' })).not.toBeDisabled());
    fireEvent.change(select, { target: { value: 'a-tarifa' } });
    fireEvent.click(within(section).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(accountingService.updateProviderFeeAccount).toHaveBeenCalled());
    expect(JSON.parse(JSON.stringify(vi.mocked(accountingService.updateProviderFeeAccount).mock.calls[0][0]))).toEqual({ unitId: 'u1', providerFeeExpenseAccountId: 'a-tarifa' });
    expect(await within(section).findByRole('status')).toHaveTextContent('Conta da tarifa salva.');
  });

  it('seção da conta da tarifa: com o GET /settings falho o Salvar fica desabilitado', async () => {
    vi.mocked(accountingService.listBankStatements).mockResolvedValue({ statements: [providerStatement()], total: 1 });
    vi.mocked(accountingService.getAccounts).mockResolvedValue({ accounts: [] });
    vi.mocked(accountingService.getSettings).mockRejectedValue({ error: 'falha de rede', status: 500 });
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    const section = await screen.findByTestId('provider-fee-account-section');
    expect(await within(section).findByText('falha de rede')).toBeTruthy();
    expect(within(section).getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('403 na lista: só o aviso', async () => {
    vi.mocked(bankSettlementService.list).mockRejectedValue({ success: false, error: 'Sem permissão para ler as baixas.', status: 403 });
    render(<BankSettlementPanel unitId="u1" glAccountId="g1" />);
    expect(await screen.findByText('Sem permissão para ler as baixas.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Varrer extrato' })).toBeNull();
  });
});
