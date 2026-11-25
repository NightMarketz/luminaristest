import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The component under test uses jsx:"preserve" + esbuild's classic runtime, so its
// JSX compiles to bare `React.createElement` with React expected in scope. Unlike the
// panels that `import React`, this one doesn't — expose it globally for the render.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { IncomeStatementPanel } from '../IncomeStatementPanel';
import {
  accountingService,
  type IncomeStatementReport,
  type StatementDiagnostics,
} from '../../../../lib/services/accounting.service';
import ptAccounting from '../../../../public/locales/pt/accounting.json';
import enAccounting from '../../../../public/locales/en/accounting.json';

vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { getIncomeStatement: vi.fn() },
}));

const diagnostics: StatementDiagnostics = {
  mappingVersion: 'v1', unmappedAccounts: [], removedAccountsReferenced: [],
  hasUnclosedPriorYearResult: false, priorYearResultCents: 0, warnings: [],
};

const report: IncomeStatementReport = {
  unitId: 'u1', periodSemantics: 'year_to_date', fromDate: '2026-01-01', toDate: '2026-06-30', mappingVersion: 'v1',
  grossRevenue: { accounts: [{ accountId: 'r1', code: '3.1', name: 'Serviços', amountCents: '100000' }], totalCents: '100000' },
  revenueDeductions: { accounts: [], totalCents: '0' },
  costOfGoodsSold: { accounts: [], totalCents: '0' },
  expenses: { accounts: [{ accountId: 'x1', code: '4.1', name: 'Salários', amountCents: '-40000' }], totalCents: '-40000' },
  netResult: { amountCents: '60000', isComputed: true, computation: 'sum' },
  reportStatus: 'OK', diagnostics,
};

describe('IncomeStatementPanel (render)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('shows the empty prompt before a report is generated', () => {
    render(<IncomeStatementPanel unitId="u1" />);
    expect(screen.getByText(/para visualizar a Demonstração do Resultado/)).toBeInTheDocument();
  });

  it('renders the DRE sections and net result after generating', async () => {
    vi.mocked(accountingService.getIncomeStatement).mockResolvedValue(report);

    const { container } = render(<IncomeStatementPanel unitId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar DRE/ }));

    await waitFor(() => expect(screen.getByText('Receita Bruta')).toBeInTheDocument());
    expect(screen.getByText(/Despesas/)).toBeInTheDocument();
    expect(screen.getByText(/Resultado Líquido do Exercício/)).toBeInTheDocument();
    // 60000 cents net → "600,00"; string-cents parsed, never "NaN".
    expect(container.textContent).toContain('600,00');
    expect(container.textContent).not.toContain('NaN');
  });

  it('renders the Custo das Mercadorias Vendidas section when the backend returns it', async () => {
    // Regression: the panel used to omit costOfGoodsSold entirely, so a booked CMV would leave
    // net result not tying out to the visible sections. The section must render with its value.
    const withCogs: IncomeStatementReport = {
      ...report,
      costOfGoodsSold: { accounts: [{ accountId: 'c1', code: '4.2', name: 'CMV', amountCents: '-25000' }], totalCents: '-25000' },
      netResult: { amountCents: '35000', isComputed: true, computation: 'sum' },
    };
    vi.mocked(accountingService.getIncomeStatement).mockResolvedValue(withCogs);

    const { container } = render(<IncomeStatementPanel unitId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar DRE/ }));

    await waitFor(() => expect(screen.getByText(/Custo das Mercadorias e Serviços Vendidos/)).toBeInTheDocument());
    // -25000 cents → "250,00" visible in the CMV section.
    expect(container.textContent).toContain('250,00');
  });

  // ── Teste-guarda L-20261121-171655-6052 — seção de custo rotulada como CMV/4.2 ──
  // Desde o #1296 a seção `costOfGoodsSold` recebe a 4.7 (custo dos serviços prestados) e, desde o #1318, a conta do
  // insumo de qualquer código. O servidor não manda rótulo de seção (`StatementSection` = accounts + totalCents), então o
  // título tem de valer para qualquer conteúdo: o da Lei 6.404/1976 art. 187 II ("custo das mercadorias e serviços
  // vendidos"), sem o subtítulo fixo "4.2". Vale para o fallback do `t()` e para os JSON de locale (a tela real lê o JSON).
  it('guarda: a seção de custo não se rotula como CMV/4.2 quando contém custo de serviço (4.7) e insumo (4.1.9)', async () => {
    const withServiceCost: IncomeStatementReport = {
      ...report,
      costOfGoodsSold: {
        accounts: [
          { accountId: 'c47', code: '4.7.1', name: 'Custo dos serviços prestados', amountCents: '-20000' },
          { accountId: 'c419', code: '4.1.9', name: 'Insumos do serviço', amountCents: '-5000' },
        ],
        totalCents: '-25000',
      },
      netResult: { amountCents: '35000', isComputed: true, computation: 'sum' },
    };
    vi.mocked(accountingService.getIncomeStatement).mockResolvedValue(withServiceCost);

    render(<IncomeStatementPanel unitId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar DRE/ }));
    await waitFor(() => expect(screen.getByText(/Custo dos serviços prestados/)).toBeInTheDocument());

    const ptLabel = (ptAccounting as { incomeStatement: { section: { costOfGoodsSold: string } } }).incomeStatement.section.costOfGoodsSold;
    const enLabel = (enAccounting as { incomeStatement: { section: { costOfGoodsSold: string } } }).incomeStatement.section.costOfGoodsSold;
    expect({
      tela: screen.queryByText('(−) Custo das Mercadorias e Serviços Vendidos') !== null,
      subtitulo42: screen.queryByText('4.2') !== null,
      pt: ptLabel,
      en: enLabel,
    }, 'a seção de custo da DRE rotula custo de serviço como "Custo das Mercadorias Vendidas · 4.2"').toEqual({
      tela: true,
      subtitulo42: false,
      pt: '(−) Custo das Mercadorias e Serviços Vendidos',
      en: '(−) Cost of Goods and Services Sold',
    });
  });

  // ── Teste-guarda (sessão de instrumentação 2026-09-01) — classe date-only UTC shift ──
  // `today()` (IncomeStatementPanel.tsx:8-10) deriva o default de `asOf` via
  // `toISOString()` (UTC): entre 21h-00h BRT o dia UTC já virou e o DRE default pede o
  // "amanhã" do escopo (DTO exige `asOf`; sem default de backend). A janela do DRE é
  // year-to-date do ANO do asOf — em 31/12 noturno o default vira 01/01 do ano seguinte
  // e o DRE default é o do ano novo, VAZIO. Comportamento correto (fork-agnóstico): na
  // posição default o campo afirma o HOJE do escopo — ou vazio, se a correção delegar.
  // Instante FIXADO com fake timers na janela que morde (determinístico em qualquer fuso).
  it('guarda: default de asOf do DRE na janela 21h-00h BRT é o hoje do escopo, não o amanhã UTC', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-01T02:30:00Z')); // 23:30 BRT de 2026-08-31
      const { container } = render(<IncomeStatementPanel unitId="u1" />);
      const input = container.querySelector('input[type="date"]') as HTMLInputElement;
      expect(
        ['', '2026-08-31'],
        'default de asOf às 23:30 BRT de 2026-08-31 deve afirmar o hoje do escopo (ou vazio) — 2026-09-01 é o "amanhã" UTC; em 31/12 esta mesma derivação entrega um DRE default do ano seguinte, vazio',
      ).toContain(input.value);
    } finally {
      vi.useRealTimers();
    }
  });
});
