import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// AccountingView não faz `import React` — mesmo shim dos demais testes do módulo.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AccountingView, DELEGATED_TABS, TABS } from '../AccountingView';
import { accountingService } from '../../../lib/services/accounting.service';
import { dimensionsService } from '../../../lib/services/dimensions.service';
import {
  accountantAssignmentsService,
  type MyAccountantAssignmentView,
} from '../../../lib/services/accountantAssignments.service';
import { DynamicTableService } from '../../../lib/services/dynamic-table.service';

/**
 * FE-INCR-ACCOUNTANT-GOVERNANCE item 13c/13c2 — a mordida do risco principal: o modo cliente (F-FE-GOV-1 b) vive
 * dentro do `AccountingView`, que monta 22 abas que resolvem o escopo do PRÓPRIO usuário. O que prova a proteção:
 * (1) só as abas de `DELEGATED_TABS` aparecem — o teste percorre o `TABS` inteiro, então uma aba nova sem decisão
 * explícita derruba aqui; (2) a aba Compliance renderiza só o `ReviewPanel`; (3) nenhuma chamada fora dos 9 handlers.
 * Todo painel irmão é stub com UM marcador (`other-panel`): se algum aparecer no modo cliente, o teste cai.
 */

vi.mock('../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: { getTables: vi.fn(), getTableData: vi.fn() },
}));
vi.mock('../../../lib/services/accounting.service', () => ({
  accountingService: { getTrialBalance: vi.fn(), getAccounts: vi.fn() },
}));
vi.mock('../../../lib/services/dimensions.service', () => ({
  dimensionsService: { listCatalog: vi.fn() },
}));
vi.mock('../../../lib/services/accountantAssignments.service', () => ({
  accountantAssignmentsService: { listMine: vi.fn(), listByScope: vi.fn(), accept: vi.fn(), end: vi.fn(), invite: vi.fn() },
}));

vi.mock('../components/TrialBalanceTable', () => ({ TrialBalanceTable: () => <div data-testid="other-panel" /> }));
vi.mock('../components/JournalEntriesPanel', () => ({ JournalEntriesPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/EntryApprovalsPanel', () => ({ EntryApprovalsPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/ChartOfAccountsPanel', () => ({ ChartOfAccountsPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/LedgerPanel', () => ({ LedgerPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/BalanceSheetPanel', () => ({ BalanceSheetPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/IncomeStatementPanel', () => ({ IncomeStatementPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/ImportExportPanel', () => ({ ImportExportPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/ReconciliationPanel', () => ({ ReconciliationPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/NfePanel', () => ({ NfePanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/CompliancePanel', () => ({ CompliancePanel: () => <div data-testid="other-panel" /> }));
// Parcial: `Field`/`inputClass` saem daqui nos modais de governança — só o painel vira stub.
vi.mock('../components/SpedGenerationPanel', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../components/SpedGenerationPanel')>()),
  SpedGenerationPanel: () => <div data-testid="other-panel" />,
}));
vi.mock('../components/DeliveryPanel', () => ({ DeliveryPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/LalurPanel', () => ({ LalurPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/DFCPanel', () => ({ DFCPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/PeriodComparisonPanel', () => ({ PeriodComparisonPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/DailyJournalPanel', () => ({ DailyJournalPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/AccountsPayablePanel', () => ({ AccountsPayablePanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/AccountsReceivablePanel', () => ({ AccountsReceivablePanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/AgingPanel', () => ({ AgingPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/CashForecastPanel', () => ({ CashForecastPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/CounterpartiesPanel', () => ({ CounterpartiesPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/DimensionsPanel', () => ({ DimensionsPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/FixedAssetsPanel', () => ({ FixedAssetsPanel: () => <div data-testid="other-panel" /> }));
vi.mock('../components/JournalEntryModal', () => ({ JournalEntryModal: () => null }));
vi.mock('../governance/AccountantAssignmentSection', () => ({ AccountantAssignmentSection: () => <div data-testid="owner-section" /> }));

// Os dois painéis delegados: o stub expõe a prop `governance` recebida.
let periodsMounts = 0;
vi.mock('../components/PeriodsPanel', () => ({
  PeriodsPanel: (p: { governance?: { ownerUserId: string } }) => {
    const [mount] = React.useState(() => ++periodsMounts);
    return <div data-testid="periods-panel" data-owner={p.governance?.ownerUserId ?? ''} data-mount={mount} />;
  },
}));
vi.mock('../components/ReviewPanel', () => ({
  ReviewPanel: (p: { governance?: { ownerUserId: string } }) => (
    <div data-testid="review-panel" data-owner={p.governance?.ownerUserId ?? ''} />
  ),
}));

const row = (over: Partial<MyAccountantAssignmentView>): MyAccountantAssignmentView => ({
  id: 'a1', unitId: 'unit-of-owner-1234', status: 'ACTIVE', accountingContactId: 'c1', accountantUserId: 'acc-1',
  crcNumber: 'SP-123456/O-3', crcUf: 'SP', activeFrom: '2026-10-01T00:00:00Z', activeUntil: null, endReason: null,
  createdAt: '2026-10-01T00:00:00Z', ownerEmail: 'dono@x.com', ownerUserId: 'owner-9', ...over,
});

function mockUnits(ids: string[]) {
  vi.mocked(DynamicTableService.getTables).mockResolvedValue({ data: [{ id: 't1', internalName: 'units' }] } as never);
  vi.mocked(DynamicTableService.getTableData).mockResolvedValue({ data: ids.map((id) => ({ id, data: { name: `Unidade ${id}` } })) } as never);
}

describe('AccountingView — modo cliente (F-FE-GOV-1 b)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(accountingService.getTrialBalance).mockResolvedValue({ balanced: true, rows: [] } as never);
    vi.mocked(accountingService.getAccounts).mockResolvedValue({ accounts: [] } as never);
    vi.mocked(dimensionsService.listCatalog).mockResolvedValue([]);
  });

  it('sem carteira (lista vazia): a tela é a de sempre — 22 abas, select de unidade, nada de seletor de livro', async () => {
    mockUnits(['u1']);
    vi.mocked(accountantAssignmentsService.listMine).mockResolvedValue([]);
    render(<AccountingView />);
    await waitFor(() => expect(accountingService.getTrialBalance).toHaveBeenCalledWith({ unitId: 'u1' }));
    expect(screen.getAllByRole('tab')).toHaveLength(TABS.length);
    expect(screen.queryByLabelText('Livro')).not.toBeInTheDocument();
    expect(screen.queryByTestId('client-mode-strip')).not.toBeInTheDocument();
  });

  it('erro na carteira: a tela fica igual à de hoje', async () => {
    mockUnits(['u1']);
    vi.mocked(accountantAssignmentsService.listMine).mockRejectedValue({ error: 'x' });
    render(<AccountingView />);
    await waitFor(() => expect(accountantAssignmentsService.listMine).toHaveBeenCalled());
    expect(await screen.findAllByRole('tab')).toHaveLength(TABS.length);
  });

  it('13c: usuário SEM unidades e com ACTIVE entra direto no modo cliente; só as abas de DELEGATED_TABS aparecem', async () => {
    mockUnits([]);
    vi.mocked(accountantAssignmentsService.listMine).mockResolvedValue([row({})]);
    render(<AccountingView />);

    expect(await screen.findByTestId('client-mode-strip')).toBeInTheDocument();

    // Percorre o TABS INTEIRO: toda aba fora da lista some; uma aba nova sem decisão explícita derruba este teste.
    const visible = screen.getAllByRole('tab').map((el) => el.textContent);
    for (const tab of TABS) {
      const isDelegated = DELEGATED_TABS.includes(tab.id);
      expect(visible.includes(tab.label), `aba ${tab.id}`).toBe(isDelegated);
    }
    expect(visible).toHaveLength(DELEGATED_TABS.length);

    // Cai em Períodos (a aba default 'balancete' não existe no modo cliente), com o ownerUserId do contexto.
    expect(screen.getByRole('tab', { name: 'Períodos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('periods-panel')).toHaveAttribute('data-owner', 'owner-9');
  });

  it('13c: a aba Compliance no modo cliente renderiza SÓ o ReviewPanel, com governance', async () => {
    mockUnits([]);
    vi.mocked(accountantAssignmentsService.listMine).mockResolvedValue([row({})]);
    render(<AccountingView />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Compliance' }));

    expect(screen.getByTestId('review-panel')).toHaveAttribute('data-owner', 'owner-9');
    expect(screen.queryByTestId('other-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('owner-section')).not.toBeInTheDocument();
  });

  it('13c: nenhuma chamada a getTrialBalance, getAccounts ou listCatalog no modo cliente', async () => {
    mockUnits([]);
    vi.mocked(accountantAssignmentsService.listMine).mockResolvedValue([row({})]);
    render(<AccountingView />);
    await screen.findByTestId('client-mode-strip');
    fireEvent.click(screen.getByRole('tab', { name: 'Compliance' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Períodos' }));
    await waitFor(() => expect(DynamicTableService.getTableData).toHaveBeenCalled());
    expect(accountingService.getTrialBalance).not.toHaveBeenCalled();
    expect(accountingService.getAccounts).not.toHaveBeenCalled();
    expect(dimensionsService.listCatalog).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Novo Lançamento/ })).not.toBeInTheDocument();
  });

  it('13c2: seletor — dono com unidades parte em "Meus livros"; ir ao cliente leva a Períodos sem balancete; voltar religa o balancete', async () => {
    mockUnits(['u1']);
    vi.mocked(accountantAssignmentsService.listMine).mockResolvedValue([row({})]);
    render(<AccountingView />);
    const selector = await screen.findByLabelText('Livro');
    await waitFor(() => expect(accountingService.getTrialBalance).toHaveBeenCalledTimes(1));
    expect(screen.getAllByRole('tab')).toHaveLength(TABS.length);

    // Numa aba própria que o modo cliente não tem, a troca de contexto leva a Períodos.
    fireEvent.click(screen.getByRole('tab', { name: 'Imobilizado' }));
    fireEvent.change(selector, { target: { value: 'a1' } });
    expect(await screen.findByTestId('client-mode-strip')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Períodos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('tab')).toHaveLength(DELEGATED_TABS.length);
    expect(accountingService.getTrialBalance).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText('Livro'), { target: { value: 'own' } });
    await waitFor(() => expect(accountingService.getTrialBalance).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('client-mode-strip')).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(TABS.length);
  });

  it('trocar de livro REMONTA o painel de Períodos (resposta atrasada/formulário aberto não passam de um contexto ao outro)', async () => {
    mockUnits(['u1']);
    vi.mocked(accountantAssignmentsService.listMine).mockResolvedValue([row({})]);
    render(<AccountingView />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Períodos' }));
    const own = screen.getByTestId('periods-panel').getAttribute('data-mount');
    fireEvent.change(await screen.findByLabelText('Livro'), { target: { value: 'a1' } });
    const client = (await screen.findByTestId('periods-panel')).getAttribute('data-mount');
    expect(client).not.toBe(own);
    fireEvent.change(screen.getByLabelText('Livro'), { target: { value: 'own' } });
    await waitFor(() => expect(screen.getByTestId('periods-panel').getAttribute('data-mount')).not.toBe(client));
  });

  it('13c2: convite PENDING aparece no banner com "Aceitar", nos dois modos', async () => {
    mockUnits(['u1']);
    vi.mocked(accountantAssignmentsService.listMine).mockResolvedValue([
      row({ id: 'a1' }),
      row({ id: 'a2', status: 'PENDING', ownerEmail: 'outro@x.com', unitId: 'unit-outro-99999' }),
    ]);
    render(<AccountingView />);
    const banner = await screen.findByTestId('pending-invites-banner');
    expect(banner).toHaveTextContent('outro@x.com · unit-out…');
    expect(screen.getByRole('button', { name: 'Aceitar' })).toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText('Livro'), { target: { value: 'a1' } });
    expect(await screen.findByTestId('client-mode-strip')).toBeInTheDocument();
    expect(screen.getByTestId('pending-invites-banner')).toBeInTheDocument();
  });

  it('o rótulo do cliente no seletor é e-mail do dono + unitId abreviado (F-FE-GOV-2 a)', async () => {
    mockUnits(['u1']);
    vi.mocked(accountantAssignmentsService.listMine).mockResolvedValue([row({})]);
    render(<AccountingView />);
    await screen.findByLabelText('Livro');
    expect(screen.getByRole('option', { name: 'dono@x.com · unit-of-…' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Meus livros' })).toBeInTheDocument();
  });

  it('o aceite recarrega a carteira: a ACTIVE nova aparece no seletor', async () => {
    mockUnits(['u1']);
    vi.mocked(accountantAssignmentsService.listMine)
      .mockResolvedValueOnce([row({ id: 'a2', status: 'PENDING' })])
      .mockResolvedValue([row({ id: 'a2', status: 'ACTIVE' })]);
    vi.mocked(accountantAssignmentsService.accept).mockResolvedValue(row({ id: 'a2', status: 'ACTIVE' }));
    render(<AccountingView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar' }));
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Aceitar' }).slice(-1)[0]);
    await waitFor(() => expect(accountantAssignmentsService.accept).toHaveBeenCalledWith('a2'));
    expect(await screen.findByLabelText('Livro')).toBeInTheDocument();
    expect(screen.queryByTestId('pending-invites-banner')).not.toBeInTheDocument();
  });

  it('encerrar pelo contador volta a "Meus livros" e recarrega a carteira', async () => {
    mockUnits(['u1']);
    vi.mocked(accountantAssignmentsService.listMine)
      .mockResolvedValueOnce([row({})])
      .mockResolvedValue([]);
    vi.mocked(accountantAssignmentsService.end).mockResolvedValue(row({ status: 'ENDED' }));
    render(<AccountingView />);
    fireEvent.change(await screen.findByLabelText('Livro'), { target: { value: 'a1' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Encerrar atribuição' }));
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'fim do contrato' } });
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));
    await waitFor(() => expect(accountantAssignmentsService.end).toHaveBeenCalledWith('a1', { reason: 'fim do contrato' }));
    await waitFor(() => expect(screen.queryByTestId('client-mode-strip')).not.toBeInTheDocument());
    expect(screen.getAllByRole('tab')).toHaveLength(TABS.length);
  });
});
