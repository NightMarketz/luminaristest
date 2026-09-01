import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// AccountingView doesn't `import React` — same shim as the other accounting panel tests
// (jsx:"preserve" + esbuild's classic runtime expects React in scope).
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AccountingView } from '../AccountingView';

/**
 * F-AGING-5(b) — proves the seed-once contract between AgingPanel and the AP/AR panels,
 * orchestrated by AccountingView (`pendingCounterpartyFilter`): a navigation click from Aging
 * arrives at the target panel WITH the counterparty filter seeded; a later MANUAL revisit to
 * the same tab (which unmounts/remounts the panel, since `AccountingView` renders each tab
 * conditionally) arrives WITHOUT any filter. Every sibling panel is mocked to a trivial stub —
 * this test is about AccountingView's orchestration, not about any one panel's own behavior
 * (those have their own test suites).
 */

vi.mock('../hooks/useAccountingData', () => ({
  useAccountingData: () => ({
    units: [{ id: 'u1', label: 'Unidade 1' }],
    unitId: 'u1',
    setUnitId: vi.fn(),
    report: null,
    loadingUnits: false,
    loadingReport: false,
    error: null,
    reload: vi.fn(),
  }),
}));

vi.mock('../../../lib/services/accounting.service', () => ({
  accountingService: { getAccounts: vi.fn() },
}));
vi.mock('../../../lib/services/dimensions.service', () => ({
  dimensionsService: { listCatalog: vi.fn() },
}));

// Every other tab's panel is irrelevant to this test — trivial stubs avoid pulling in their
// own network calls / nested services.
vi.mock('../components/TrialBalanceTable', () => ({ TrialBalanceTable: () => null }));
vi.mock('../components/JournalEntriesPanel', () => ({ JournalEntriesPanel: () => null }));
vi.mock('../components/EntryApprovalsPanel', () => ({ EntryApprovalsPanel: () => null }));
vi.mock('../components/ChartOfAccountsPanel', () => ({ ChartOfAccountsPanel: () => null }));
vi.mock('../components/PeriodsPanel', () => ({ PeriodsPanel: () => null }));
vi.mock('../components/LedgerPanel', () => ({ LedgerPanel: () => null }));
vi.mock('../components/BalanceSheetPanel', () => ({ BalanceSheetPanel: () => null }));
vi.mock('../components/IncomeStatementPanel', () => ({ IncomeStatementPanel: () => null }));
vi.mock('../components/ImportExportPanel', () => ({ ImportExportPanel: () => null }));
vi.mock('../components/ReconciliationPanel', () => ({ ReconciliationPanel: () => null }));
vi.mock('../components/CompliancePanel', () => ({ CompliancePanel: () => null }));
vi.mock('../components/SpedGenerationPanel', () => ({ SpedGenerationPanel: () => null }));
vi.mock('../components/DFCPanel', () => ({ DFCPanel: () => null }));
vi.mock('../components/PeriodComparisonPanel', () => ({ PeriodComparisonPanel: () => null }));
vi.mock('../components/DailyJournalPanel', () => ({ DailyJournalPanel: () => null }));
vi.mock('../components/CounterpartiesPanel', () => ({ CounterpartiesPanel: () => null }));
vi.mock('../components/DimensionsPanel', () => ({ DimensionsPanel: () => null }));
vi.mock('../components/JournalEntryModal', () => ({ JournalEntryModal: () => null }));

// AgingPanel stub: exposes two buttons that call the navigation callbacks with a fixed
// counterpartyId, exactly like a real click on a group row would.
vi.mock('../components/AgingPanel', () => ({
  AgingPanel: (props: { onNavigateToPayable?: (id: string) => void; onNavigateToReceivable?: (id: string) => void }) => (
    <div>
      <button type="button" onClick={() => props.onNavigateToPayable?.('cp-42')}>
        ir-para-pagar
      </button>
      <button type="button" onClick={() => props.onNavigateToReceivable?.('cp-42')}>
        ir-para-receber
      </button>
    </div>
  ),
}));

// AP/AR stubs: capture `initialFilters` into their OWN state on mount — same seed-once
// contract as the real panels (`useState(() => initialFilters ?? {})`, never re-synced from a
// later prop change). A naive "render the live prop" stub would be wrong here: it would flip
// back to null the moment AccountingView's cleanup effect clears `pendingCounterpartyFilter`,
// which is exactly the behavior this test must NOT observe (the real panels don't do that).
vi.mock('../components/AccountsPayablePanel', () => ({
  AccountsPayablePanel: (props: { initialFilters?: { counterpartyId?: string } }) => {
    const [seed] = React.useState(() => props.initialFilters ?? null);
    return <div data-testid="ap-panel">seed:{JSON.stringify(seed)}</div>;
  },
}));
vi.mock('../components/AccountsReceivablePanel', () => ({
  AccountsReceivablePanel: (props: { initialFilters?: { counterpartyId?: string } }) => {
    const [seed] = React.useState(() => props.initialFilters ?? null);
    return <div data-testid="ar-panel">seed:{JSON.stringify(seed)}</div>;
  },
}));

describe('AccountingView — F-AGING-5(b) cross-navigation seed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('arrives at Contas a Pagar WITH the counterparty filter seeded when navigated from Aging', () => {
    render(<AccountingView />);

    fireEvent.click(screen.getByRole('tab', { name: /Aging/ }));
    fireEvent.click(screen.getByText('ir-para-pagar'));

    expect(screen.getByTestId('ap-panel').textContent).toBe('seed:{"counterpartyId":"cp-42"}');
  });

  it('arrives at Contas a Receber WITH the counterparty filter seeded when navigated from Aging', () => {
    render(<AccountingView />);

    fireEvent.click(screen.getByRole('tab', { name: /Aging/ }));
    fireEvent.click(screen.getByText('ir-para-receber'));

    expect(screen.getByTestId('ar-panel').textContent).toBe('seed:{"counterpartyId":"cp-42"}');
  });

  it('a later MANUAL revisit (via the tab bar) to the same tab arrives WITHOUT any filter', () => {
    render(<AccountingView />);

    // Navigate from Aging first — arrives filtered.
    fireEvent.click(screen.getByRole('tab', { name: /Aging/ }));
    fireEvent.click(screen.getByText('ir-para-pagar'));
    expect(screen.getByTestId('ap-panel').textContent).toBe('seed:{"counterpartyId":"cp-42"}');

    // Leave the tab (unmounts AccountsPayablePanel — AccountingView renders each tab
    // conditionally) and manually click back on it via the tab bar.
    fireEvent.click(screen.getByRole('tab', { name: /Contas a Receber/ }));
    fireEvent.click(screen.getByRole('tab', { name: /^Contas a Pagar$/ }));

    // The pending seed was consumed (cleared) right after the first mount — this remount
    // gets no filter, exactly like any manual visit.
    expect(screen.getByTestId('ap-panel').textContent).toBe('seed:null');
  });
});
