import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// CashForecastPanel doesn't `import React` (jsx:"preserve" + esbuild's classic runtime expects it
// in scope) — same shim as AgingPanel.test.tsx/BalanceSheetPanel.test.tsx.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { CashForecastPanel } from '../CashForecastPanel';
import { accountingService, type CashForecastReport } from '../../../../lib/services/accounting.service';

vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { getCashForecast: vi.fn() },
}));

function zeroedLine(periodStart: string) {
  return {
    periodStart,
    periodEnd: periodStart,
    inflowCents: '0',
    outflowCents: '0',
    netCents: '0',
    projectedBalanceCents: '10000',
    documents: [],
  };
}

const baseReport: CashForecastReport = {
  unitId: 'u1',
  asOf: '2026-07-16',
  openingBalanceCents: '10000',
  lines: [
    zeroedLine('2026-07-16'),
    {
      periodStart: '2026-07-20',
      periodEnd: '2026-07-20',
      inflowCents: '50000',
      outflowCents: '30000',
      netCents: '20000',
      projectedBalanceCents: '30000',
      documents: [
        { id: 'r1', kind: 'receivable', documentNumber: 'FT-r1', dueDate: '2026-07-20', amountCents: '50000' },
        { id: 'p1', kind: 'payable', documentNumber: 'NF-p1', dueDate: '2026-07-20', amountCents: '30000' },
      ],
    },
  ],
  totalInflowCents: '50000',
  totalOutflowCents: '30000',
  totalNetCents: '20000',
};

const negativeReport: CashForecastReport = {
  ...baseReport,
  lines: [
    {
      periodStart: '2026-07-16',
      periodEnd: '2026-07-16',
      inflowCents: '0',
      outflowCents: '15000',
      netCents: '-15000',
      projectedBalanceCents: '-5000',
      documents: [
        { id: 'p2', kind: 'payable', documentNumber: 'NF-p2', dueDate: '2026-07-16', amountCents: '15000' },
      ],
    },
  ],
  totalInflowCents: '0',
  totalOutflowCents: '15000',
  totalNetCents: '-15000',
};

describe('CashForecastPanel (render)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('shows the empty prompt before a report is generated', () => {
    render(<CashForecastPanel unitId="u1" />);
    expect(screen.getByRole('button', { name: /Gerar/ })).toBeInTheDocument();
    expect(screen.getByText(/visualizar a projeção de caixa/)).toBeInTheDocument();
  });

  it('generates and renders daily lines, a no-movement day, and the drill by document (PAYING/RECEIVING included)', async () => {
    vi.mocked(accountingService.getCashForecast).mockResolvedValue(baseReport);

    const { container } = render(<CashForecastPanel unitId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar/ }));

    await waitFor(() => expect(screen.getByText('Sem vencimentos neste dia.')).toBeInTheDocument());
    // Drill sempre expandido (F-CF9→a): documento payable e receivable ambos visíveis sem clique extra.
    expect(screen.getByText('NF-p1')).toBeInTheDocument();
    expect(screen.getByText('FT-r1')).toBeInTheDocument();
    // Money is string cents — must be parseInt'd before formatting, never "NaN".
    expect(container.textContent).not.toContain('NaN');
  });

  it('highlights a negative projected balance', async () => {
    vi.mocked(accountingService.getCashForecast).mockResolvedValue(negativeReport);

    render(<CashForecastPanel unitId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar/ }));

    await waitFor(() => expect(screen.getByText('Negativo')).toBeInTheDocument());
    // -5000 cents = -R$ 50,00
    expect(screen.getByText(/-R\$\s?50,00/)).toBeInTheDocument();
  });

  it('shows the resolved error message on a policy (403) failure', async () => {
    vi.mocked(accountingService.getCashForecast).mockRejectedValue({ error: 'Forbidden', status: 403 });

    render(<CashForecastPanel unitId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar/ }));

    await waitFor(() => expect(screen.getByText('Forbidden')).toBeInTheDocument());
  });
});
