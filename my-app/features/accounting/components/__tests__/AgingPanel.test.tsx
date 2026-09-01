import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// AgingPanel doesn't `import React` (jsx:"preserve" + esbuild's classic runtime expects it in
// scope) — same shim as BalanceSheetPanel.test.tsx.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AgingPanel } from '../AgingPanel';
import { accountingService, type AgingReport } from '../../../../lib/services/accounting.service';

vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { getAging: vi.fn() },
}));

const reportWithTieOut: AgingReport = {
  unitId: 'u1',
  kind: 'payable',
  asOf: '2026-08-31',
  buckets: { a_vencer: '10000', d1_30: '5000', d31_60: '0', d61_90: '0', d90_plus: '0' },
  totalCents: '15000',
  groups: [
    {
      counterpartyId: 'cp1',
      counterpartyName: 'Fornecedor Alfa',
      buckets: { a_vencer: '10000', d1_30: '0', d31_60: '0', d61_90: '0', d90_plus: '0' },
      totalCents: '10000',
      documents: [
        {
          id: 'doc1',
          documentNumber: 'NF-1',
          dueDate: '2026-09-15',
          daysOverdue: -15,
          bucket: 'a_vencer',
          amountCents: '10000',
        },
      ],
    },
    {
      counterpartyId: null,
      counterpartyName: '(Sem contraparte)',
      buckets: { a_vencer: '0', d1_30: '5000', d31_60: '0', d61_90: '0', d90_plus: '0' },
      totalCents: '5000',
      documents: [
        {
          id: 'doc2',
          documentNumber: null,
          dueDate: '2026-08-10',
          daysOverdue: 21,
          bucket: 'd1_30',
          amountCents: '5000',
        },
      ],
    },
  ],
  tieOut: {
    controlAccountCode: '2.1.2',
    subledgerTotalCents: '15000',
    controlAccountBalanceCents: '15000',
    differenceCents: '0',
    tiesOut: true,
  },
  tieOutSkippedReason: null,
};

const reportSkippedTieOut: AgingReport = {
  ...reportWithTieOut,
  asOf: '2026-08-20',
  tieOut: null,
  tieOutSkippedReason: 'as_of_not_today',
};

describe('AgingPanel (render)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('shows the empty prompt before a report is generated', () => {
    render(<AgingPanel unitId="u1" />);
    expect(screen.getByRole('button', { name: /Gerar/ })).toBeInTheDocument();
    expect(screen.getByText(/visualizar a posição de aging/)).toBeInTheDocument();
  });

  it('renders groups (including "(Sem contraparte)") and an OK tie-out after generating', async () => {
    vi.mocked(accountingService.getAging).mockResolvedValue(reportWithTieOut);

    const { container } = render(<AgingPanel unitId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar/ }));

    await waitFor(() => expect(screen.getByText('Fornecedor Alfa')).toBeInTheDocument());
    expect(screen.getByText('(Sem contraparte)')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
    // String-cents money must be parseInt'd before formatting — never "NaN".
    expect(container.textContent).toContain('100,00');
    expect(container.textContent).not.toContain('NaN');
  });

  it('renders the skipped-reason text when tieOut is null', async () => {
    vi.mocked(accountingService.getAging).mockResolvedValue(reportSkippedTieOut);

    render(<AgingPanel unitId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar/ }));

    await waitFor(() =>
      expect(screen.getByText(/Tie-out disponível apenas para a posição de hoje/)).toBeInTheDocument(),
    );
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });

  it('shows the resolved error message on a policy (403) failure', async () => {
    vi.mocked(accountingService.getAging).mockRejectedValue({ error: 'Forbidden', status: 403 });

    render(<AgingPanel unitId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar/ }));

    await waitFor(() => expect(screen.getByText('Forbidden')).toBeInTheDocument());
  });
});
