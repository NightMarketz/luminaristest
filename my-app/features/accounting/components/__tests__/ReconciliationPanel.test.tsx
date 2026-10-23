import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { ReconciliationPanel } from '../ReconciliationPanel';
import { accountingService, type Account } from '../../../../lib/services/accounting.service';

vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: {
    getAccounts: vi.fn(),
    listBankStatements: vi.fn(),
    getPendingReport: vi.fn(),
    importBankStatement: vi.fn(),
  },
}));

const bankAccount: Account = {
  id: 'a1', code: '1.1.2', name: 'Banco', nature: 'Asset', acceptsEntries: true,
};

describe('ReconciliationPanel (render)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(accountingService.getAccounts).mockResolvedValue({ accounts: [bankAccount] });
    vi.mocked(accountingService.listBankStatements).mockResolvedValue({ statements: [], total: 0 });
    vi.mocked(accountingService.getPendingReport).mockResolvedValue({
      account: { id: 'a1', code: '1.1.2', name: 'Banco' }, unmatchedLines: [], unmatchedPostings: [],
      totals: { lineCount: 0, lineTotalCents: 0, postingCount: 0 },
    });
  });

  it('defaults to the Extratos sub-view with its import form and empty state', async () => {
    render(<ReconciliationPanel unitId="u1" />);

    // Both sub-tabs render; Extratos is active by default.
    expect(screen.getByRole('button', { name: 'Extratos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fila pendente' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Importar extrato/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Nenhum extrato importado/)).toBeInTheDocument());
    // Guarda da classe `t`-instável — ver features/accounting/lib/useAccountingT.
    expect(accountingService.listBankStatements).toHaveBeenCalledTimes(1);
  });

  it('switches to the Fila pendente sub-view', async () => {
    render(<ReconciliationPanel unitId="u1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Fila pendente' }));

    await waitFor(() =>
      expect(screen.getByText(/Linhas do extrato sem conciliação/)).toBeInTheDocument(),
    );
  });
});

// ── FE-INCR-PAYMENT-PROVIDER PR-3 — relatório de liberações do MP (itens 22–25) ───────────────────────────────
describe('ReconciliationPanel — Mercado Pago', () => {
  const second: Account = { id: 'a2', code: '1.1.9', name: 'Saldo MP', nature: 'Asset', acceptsEntries: true };
  const statement = (over: Record<string, unknown>) => ({
    id: 's1', userId: 'o1', unitId: 'u1', glAccountId: 'a1', statementRef: null, periodStart: '2026-09-01',
    periodEnd: '2026-09-30', openingBalanceCents: null, closingBalanceCents: null, sha256: 'h', attachmentId: null,
    importedById: null, paymentAccountId: null, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
    deletedAt: null, ...over,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(accountingService.getAccounts).mockResolvedValue({ accounts: [bankAccount, second] });
    vi.mocked(accountingService.listBankStatements).mockResolvedValue({ statements: [], total: 0 });
  });

  function pickFile(container: HTMLElement) {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'liberacoes.csv', { type: 'text/csv' })] } });
  }

  async function fillPeriod() {
    await waitFor(() => expect(screen.getByRole('option', { name: '1.1.2 — Banco' })).toBeInTheDocument());
    fireEvent.change(screen.getByText('Início do período').querySelector('input') as HTMLInputElement, { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByText('Fim do período').querySelector('input') as HTMLInputElement, { target: { value: '2026-09-30' } });
  }

  it('item 22: modo MP desabilita e esvazia os saldos e envia format=mp_release sem saldo', async () => {
    vi.mocked(accountingService.importBankStatement).mockResolvedValue({ created: true, lineCount: 2 } as never);
    const { container } = render(<ReconciliationPanel unitId="u1" />);
    await fillPeriod();
    const opening = screen.getByText('Saldo inicial (centavos)').querySelector('input') as HTMLInputElement;
    fireEvent.change(opening, { target: { value: '100' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Formato' }), { target: { value: 'mp_release' } });
    expect(opening).toBeDisabled();
    expect(opening.value).toBe('');
    expect(screen.getByText('Saldo final (centavos)').querySelector('input')).toBeDisabled();
    pickFile(container);
    await waitFor(() => expect(accountingService.importBankStatement).toHaveBeenCalledTimes(1));
    const params = vi.mocked(accountingService.importBankStatement).mock.calls[0][0];
    expect(params.format).toBe('mp_release');
    expect(params.openingBalanceCents).toBeUndefined();
    expect(params.closingBalanceCents).toBeUndefined();
  });

  it('item 22: modo padrão (detectar) não manda format', async () => {
    vi.mocked(accountingService.importBankStatement).mockResolvedValue({ created: true, lineCount: 2 } as never);
    const { container } = render(<ReconciliationPanel unitId="u1" />);
    await fillPeriod();
    pickFile(container);
    await waitFor(() => expect(accountingService.importBankStatement).toHaveBeenCalledTimes(1));
    expect(vi.mocked(accountingService.importBankStatement).mock.calls[0][0].format).toBeUndefined();
  });

  const cases: Array<[string, number, string, RegExp]> = [
    ['release_report_no_payment_account', 409, 'release_report_no_payment_account: folha sem conta', /não tem conta Mercado Pago; cadastre na aba Cobrança/],
    // Formato real do BE (verificado no build de produção 23/10): ValidationError ⇒ code VALIDATION_ERROR; a mensagem já diz "nada foi importado".
    ['VALIDATION_ERROR', 400, 'release_report_overlap: 1 SOURCE_ID já importado(s) para esta conta Mercado Pago — nada foi importado.', /^release_report_overlap: 1 SOURCE_ID já importado\(s\) para esta conta Mercado Pago — nada foi importado\.$/],
    ['VALIDATION_ERROR', 400, 'Colunas ausentes: SOURCE_ID', /^Colunas ausentes: SOURCE_ID$/],
  ];
  for (const [code, status, message, expected] of cases) {
    it(`item 23: ${code} ⇒ texto da tela`, async () => {
      vi.mocked(accountingService.importBankStatement).mockRejectedValue({ status, code, message });
      const { container } = render(<ReconciliationPanel unitId="u1" />);
      await fillPeriod();
      fireEvent.change(screen.getByRole('combobox', { name: 'Formato' }), { target: { value: 'mp_release' } });
      pickFile(container);
      await waitFor(() => expect(screen.getByText(expected)).toBeInTheDocument());
    });
  }

  it('item 24: com initialGlAccountId o select abre na folha; sem a prop, na primeira (regressão)', async () => {
    render(<ReconciliationPanel unitId="u1" initialGlAccountId="a2" />);
    await waitFor(() => expect(screen.getByRole('option', { name: '1.1.9 — Saldo MP' })).toBeInTheDocument());
    const selects = screen.getAllByRole('combobox');
    const accountSelect = selects.find((s) => (s as HTMLSelectElement).querySelector('option[value="a2"]')) as HTMLSelectElement;
    expect(accountSelect.value).toBe('a2');

    cleanup();
    render(<ReconciliationPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByRole('option', { name: '1.1.9 — Saldo MP' })).toBeInTheDocument());
    const again = screen.getAllByRole('combobox').find((s) => (s as HTMLSelectElement).querySelector('option[value="a2"]')) as HTMLSelectElement;
    expect(again.value).toBe('a1');
  });

  it('item 25: extrato com paymentAccountId ganha o selo "Mercado Pago"; null não', async () => {
    vi.mocked(accountingService.listBankStatements).mockResolvedValue({
      statements: [statement({ id: 's1', paymentAccountId: 'pa1', statementRef: 'mp' }), statement({ id: 's2', statementRef: 'banco' })],
      total: 2,
    } as never);
    render(<ReconciliationPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('mp')).toBeInTheDocument());
    const mpRow = screen.getByText('mp').closest('tr') as HTMLElement;
    const bankRow = screen.getByText('banco').closest('tr') as HTMLElement;
    expect(mpRow.textContent).toContain('Mercado Pago');
    expect(bankRow.textContent).not.toContain('Mercado Pago');
  });
});
