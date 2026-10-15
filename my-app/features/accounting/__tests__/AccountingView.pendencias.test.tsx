import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AccountingView, PENDENCIAS_TAB, TABS } from '../AccountingView';

/**
 * BE-INCR-ONBOARDING-ACTIVATION item 18 (I5 PR-3, F-I5-4 a): a aba `pendencias` entra em `TABS`, e com ela o link
 * "Ver pendências da unidade" da faixa da LAC-B (`PENDENCIAS_TAB`, FE-INCR-BINDING-ACTIVATION item 8) passa a existir
 * e troca para a aba. O comportamento da faixa em si (o link só aparece com o callback) é provado no teste dela.
 */
const current = { unitId: 'u1' };
vi.mock('../hooks/useAccountingData', () => ({
  useAccountingData: () => ({
    units: [{ id: 'u1', label: 'Unidade 1' }, { id: 'u2', label: 'Unidade 2' }],
    unitId: current.unitId,
    setUnitId: vi.fn(),
    report: null,
    loadingUnits: false,
    loadingReport: false,
    error: null,
    reload: vi.fn(),
  }),
}));
vi.mock('../../../lib/services/accounting.service', () => ({ accountingService: { getAccounts: vi.fn() } }));
vi.mock('../../../lib/services/accountantAssignments.service', () => ({
  accountantAssignmentsService: { listByScope: vi.fn(async () => []), listMine: vi.fn(async () => []) },
}));
vi.mock('../../../lib/services/dimensions.service', () => ({ dimensionsService: { listCatalog: vi.fn() } }));
vi.mock('../components/TrialBalanceTable', () => ({ TrialBalanceTable: () => null }));
vi.mock('../components/ReconcilePendingPanel', () => ({
  ReconcilePendingPanel: (p: { unitId: string }) => <div data-testid="reconcile-pending-panel-mock">{p.unitId}</div>,
}));
// A faixa real busca bindings; aqui ela só expõe o link quando recebe o callback — o mesmo contrato da faixa.
vi.mock('../components/AccountingActivationBanner', () => ({
  AccountingActivationBanner: (p: { unitId: string; onNavigateToPendencias?: () => void }) => (
    <div data-testid={`banner-${p.unitId}`}>
      {p.onNavigateToPendencias ? <button type="button" onClick={p.onNavigateToPendencias}>Ver pendências da unidade</button> : null}
    </div>
  ),
}));

describe('AccountingView — aba Pendências (I5 PR-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    current.unitId = 'u1';
  });

  it("'pendencias' está em TABS e PENDENCIAS_TAB deixa de ser undefined", () => {
    expect(TABS.map((t) => t.id)).toContain('pendencias');
    expect(PENDENCIAS_TAB).toBe('pendencias');
  });

  it('a barra de abas tem "Pendências" (27ª, depois de Apuração) e clicar nela renderiza o painel da unidade', async () => {
    render(<AccountingView />);
    const tabs = await screen.findAllByRole('tab');
    expect(tabs).toHaveLength(27);
    expect(tabs[26]).toHaveTextContent('Pendências');
    fireEvent.click(tabs[26]);
    expect(await screen.findByTestId('reconcile-pending-panel-mock')).toHaveTextContent('u1');
  });

  // Review independente do #686 (achado A): painel e faixa são irmãos — a mesma `key` deixava a faixa da unidade
  // antiga órfã na tela ao trocar de unidade com a aba Pendências aberta.
  it('trocar de unidade com a aba aberta deixa UMA faixa, a da unidade nova', async () => {
    const { rerender } = render(<AccountingView />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Pendências' }));
    await screen.findByTestId('reconcile-pending-panel-mock');
    current.unitId = 'u2';
    rerender(<AccountingView />);
    expect(await screen.findByTestId('reconcile-pending-panel-mock')).toHaveTextContent('u2');
    expect(screen.queryAllByTestId(/^banner-/).map((el) => el.getAttribute('data-testid'))).toEqual(['banner-u2']);
  });

  it('o link da faixa de ativação renderiza e troca para a aba Pendências', async () => {
    render(<AccountingView />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver pendências da unidade' }));
    expect(await screen.findByTestId('reconcile-pending-panel-mock')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pendências' })).toHaveAttribute('aria-selected', 'true');
  });
});
