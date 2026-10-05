import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AccountingView, DELEGATED_TABS, TABS } from '../AccountingView';
import { accountingService } from '../../../lib/services/accounting.service';
import { dimensionsService } from '../../../lib/services/dimensions.service';
import { accountantAssignmentsService } from '../../../lib/services/accountantAssignments.service';
import { DynamicTableService } from '../../../lib/services/dynamic-table.service';

/**
 * FE-INCR-DFE PR-0 item 2 (F-FE-DFE-6 a): a aba "Perfil fiscal" monta o painel da unidade e o dos serviços com o
 * `unitId` do seletor da Contabilidade — e, sendo aba nova sem decisão em contrário, NÃO é delegável ao contador.
 */
vi.mock('../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: { getTables: vi.fn(), getTableData: vi.fn() },
}));
vi.mock('../../../lib/services/accounting.service', () => ({
  accountingService: { getTrialBalance: vi.fn(), getAccounts: vi.fn() },
}));
vi.mock('../../../lib/services/dimensions.service', () => ({ dimensionsService: { listCatalog: vi.fn() } }));
vi.mock('../../../lib/services/accountantAssignments.service', () => ({
  accountantAssignmentsService: { listMine: vi.fn(), listByScope: vi.fn(), accept: vi.fn(), end: vi.fn(), invite: vi.fn() },
}));
vi.mock('../components/FiscalProfilePanel', () => ({
  FiscalProfilePanel: (p: { unitId: string }) => <div data-testid="unit-profile" data-unit={p.unitId} />,
}));
vi.mock('../components/ServiceFiscalProfilesPanel', () => ({
  ServiceFiscalProfilesPanel: (p: { unitId: string }) => <div data-testid="service-profiles" data-unit={p.unitId} />,
}));

describe('AccountingView — aba Perfil fiscal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(DynamicTableService.getTables).mockResolvedValue({ data: [{ id: 't1', internalName: 'units' }] } as never);
    vi.mocked(DynamicTableService.getTableData).mockResolvedValue({ data: [{ id: 'u1', data: { name: 'Unidade u1' } }] } as never);
    vi.mocked(accountingService.getTrialBalance).mockResolvedValue({ balanced: true, rows: [] } as never);
    vi.mocked(accountingService.getAccounts).mockResolvedValue({ accounts: [] } as never);
    vi.mocked(dimensionsService.listCatalog).mockResolvedValue([]);
    vi.mocked(accountantAssignmentsService.listMine).mockResolvedValue([]);
  });
  afterEach(async () => { await new Promise((r) => setTimeout(r, 0)); cleanup(); });

  it('a aba existe, abre os dois painéis (unidade em cima, serviços embaixo) com o unitId do seletor', async () => {
    render(<AccountingView />);
    await waitFor(() => expect(accountingService.getTrialBalance).toHaveBeenCalledWith({ unitId: 'u1' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Perfil fiscal' }));
    const unit = await screen.findByTestId('unit-profile');
    const services = screen.getByTestId('service-profiles');
    expect(unit).toHaveAttribute('data-unit', 'u1');
    expect(services).toHaveAttribute('data-unit', 'u1');
    expect(unit.compareDocumentPosition(services) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('não é aba do modo cliente (allowlist DELEGATED_TABS)', () => {
    expect(TABS.map((t) => t.id)).toContain('perfil-fiscal');
    expect(DELEGATED_TABS).not.toContain('perfil-fiscal');
  });
});
