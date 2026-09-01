import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The component under test uses jsx:"preserve" + esbuild's classic runtime, so its
// JSX compiles to bare `React.createElement` with React expected in scope. Unlike the
// panels that `import React`, this one doesn't — expose it globally for the render.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { BalanceSheetPanel } from '../BalanceSheetPanel';
import {
  accountingService,
  type BalanceSheetReport,
  type StatementDiagnostics,
} from '../../../../lib/services/accounting.service';

vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { getBalanceSheet: vi.fn() },
}));

const diagnostics: StatementDiagnostics = {
  mappingVersion: 'v1', unmappedAccounts: [], removedAccountsReferenced: [],
  hasUnclosedPriorYearResult: false, priorYearResultCents: 0, warnings: [],
};

const report: BalanceSheetReport = {
  unitId: 'u1', periodSemantics: 'as_of', asOf: '2026-06-30', mappingVersion: 'v1',
  assets: { accounts: [{ accountId: 'a1', code: '1', name: 'Ativo Circulante', amountCents: '100000' }], totalCents: '100000' },
  liabilities: { accounts: [], totalCents: '0' },
  equity: { accounts: [{ accountId: 'e1', code: '2.3', name: 'Capital', amountCents: '100000' }], totalCents: '100000' },
  netResultLine: { amountCents: '0', isComputed: true, computation: 'sum', fromDate: '2026-01-01', toDate: '2026-06-30' },
  balanced: true, reportStatus: 'OK', diagnostics,
};

describe('BalanceSheetPanel (render)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('shows the empty prompt before a report is generated', () => {
    render(<BalanceSheetPanel unitId="u1" />);
    // "Gerar BP" appears both on the button and inside the prompt sentence — target
    // the button by role, and the prompt by its unique tail.
    expect(screen.getByRole('button', { name: /Gerar BP/ })).toBeInTheDocument();
    expect(screen.getByText(/para visualizar o Balanço Patrimonial/)).toBeInTheDocument();
  });

  it('renders the BP sections and balanced badge after generating', async () => {
    vi.mocked(accountingService.getBalanceSheet).mockResolvedValue(report);

    const { container } = render(<BalanceSheetPanel unitId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar BP/ }));

    await waitFor(() => expect(screen.getByText('Ativo')).toBeInTheDocument());
    expect(screen.getByText('Passivo')).toBeInTheDocument();
    expect(screen.getByText('Patrimônio Líquido')).toBeInTheDocument();
    expect(screen.getByText('Balanceado')).toBeInTheDocument();
    // String-cents money must be parseInt'd before formatting — never "NaN".
    expect(container.textContent).toContain('1.000,00');
    expect(container.textContent).not.toContain('NaN');
  });

  // ── Teste-guarda (sessão de instrumentação 2026-09-01) — classe date-only UTC shift ──
  // `today()` (BalanceSheetPanel.tsx:8-10) deriva o default de `asOf` via `toISOString()`
  // (UTC): entre 21h-00h BRT o dia UTC já virou e a posição default afirma o "amanhã" do
  // escopo (o DTO exige `asOf`, o backend não tem default próprio — a data do FE é a que
  // vale). Em 31/12 noturno o dano cresce: a linha de resultado (janela = ano do asOf)
  // vira o ANO SEGUINTE, vazio. Comportamento correto (fork-agnóstico): na posição
  // default o campo afirma o HOJE do escopo — ou vazio, se a correção delegar o default.
  // Determinismo (armadilha teste-de-hoje-quebra-em-janela-utc): instante FIXADO com
  // fake timers dentro da janela que morde — 2026-09-01T02:30Z = 23:30 BRT de 2026-08-31.
  it('guarda: default de "Posição em" na janela 21h-00h BRT é o hoje do escopo, não o amanhã UTC', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-01T02:30:00Z')); // 23:30 BRT de 2026-08-31
      const { container } = render(<BalanceSheetPanel unitId="u1" />);
      const input = container.querySelector('input[type="date"]') as HTMLInputElement;
      expect(
        ['', '2026-08-31'],
        'default de asOf às 23:30 BRT de 2026-08-31 deve afirmar o hoje do escopo (ou vazio) — 2026-09-01 é o "amanhã" UTC: o BP default pede a posição de um dia que ainda não existe no escopo',
      ).toContain(input.value);
    } finally {
      vi.useRealTimers();
    }
  });
});
