import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

import { DFCPanel } from '../DFCPanel';
import { PeriodComparisonPanel } from '../PeriodComparisonPanel';
import { DailyJournalPanel } from '../DailyJournalPanel';
import { accountingService } from '../../../../lib/services/accounting.service';

vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: {
    getCashFlow: vi.fn(),
    getPeriodComparison: vi.fn(),
    getDailyJournal: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});

// ── DFC: money is STRING cents → must parseInt before formatting ─────────────
describe('DFCPanel (string cents)', () => {
  it('formats string-cents money (parseInt path, not "NaN")', async () => {
    vi.mocked(accountingService.getCashFlow).mockResolvedValue({
      unitId: 'u1', method: 'indirect', periodSemantics: 'year_to_date',
      fromDate: '2026-01-01', toDate: '2026-06-30', mappingVersion: 'v1',
      operating: { accounts: [], netResultCents: '100000', adjustmentsCents: '0', totalCents: '100000' },
      investing: { accounts: [], totalCents: '0' },
      financing: { accounts: [], totalCents: '0' },
      openingCashCents: '0', closingCashCents: '100000',
      reconciliation: { sectionsTotalCents: '100000', computedClosingCents: '100000', reconciles: true },
      reportStatus: 'OK', warnings: [],
    });

    const { container } = render(<DFCPanel unitId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar DFC/ }));

    await waitFor(() => expect(container.textContent).toContain('1.000,00'));
    expect(container.textContent).not.toContain('NaN');
  });
});

// ── Period comparison: number cents + null deltaPct → "—" ────────────────────
describe('PeriodComparisonPanel (number cents, null baseline)', () => {
  it('renders numeric money directly and shows "—" when previous is 0', async () => {
    vi.mocked(accountingService.getPeriodComparison).mockResolvedValue({
      unitId: 'u1', asOfCurrent: '2026-06-30', asOfPrevious: '2026-05-31',
      rows: [
        { code: '1.1.1', name: 'Caixa', current: 250000, previous: 200000, deltaAbs: 50000, deltaPct: 25 },
        { code: '3.1', name: 'Receita', current: 100000, previous: 0, deltaAbs: 100000, deltaPct: null },
      ],
    });

    const { container } = render(<PeriodComparisonPanel unitId="u1" />);
    fireEvent.change(screen.getAllByDisplayValue('')[0] ?? document.createElement('input'), { target: { value: '2026-05-31' } });
    // both date inputs need a value to enable the button; set them directly
    const inputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(inputs[0], { target: { value: '2026-06-30' } });
    fireEvent.change(inputs[1], { target: { value: '2026-05-31' } });
    fireEvent.click(screen.getByRole('button', { name: /Gerar comparativo/ }));

    await waitFor(() => expect(container.textContent).toContain('2.500,00'));
    expect(container.textContent).toContain('25.0%');
    expect(container.textContent).toContain('—'); // null deltaPct baseline
    expect(container.textContent).not.toContain('NaN');
  });
});

// ── Testes-guarda (sessão de instrumentação 2026-09-01) — classe date-only UTC shift ──
// Cada painel deriva o default do seu campo de data via `new Date().toISOString().slice(0,10)`
// (UTC): entre 21h-00h BRT o dia UTC já virou e o default afirma o "amanhã" do escopo. Os
// DTOs exigem a data (sem default de backend). No DFC a janela é year-to-date do ano do
// asOf — em 31/12 noturno o default entrega o DFC do ano seguinte, vazio. Comportamento
// correto (fork-agnóstico): na posição default o campo afirma o HOJE do escopo — ou
// vazio, se a correção delegar o default. Instante FIXADO com fake timers dentro da
// janela que morde — 2026-09-01T02:30Z = 23:30 BRT de 2026-08-31 — determinístico em
// qualquer máquina/fuso (armadilha teste-de-hoje-quebra-em-janela-utc).
describe('defaults de data — janela 21h-00h BRT (classe date-only UTC shift)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('guarda: DFCPanel — default de asOf é o hoje do escopo, não o amanhã UTC', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-01T02:30:00Z')); // 23:30 BRT de 2026-08-31
      const { container } = render(<DFCPanel unitId="u1" />);
      const input = container.querySelector('input[type="date"]') as HTMLInputElement;
      expect(
        ['', '2026-08-31'],
        'default de asOf do DFC às 23:30 BRT de 2026-08-31 deve afirmar o hoje do escopo (ou vazio) — 2026-09-01 é o "amanhã" UTC; em 31/12 esta derivação entrega o DFC do ano seguinte, vazio',
      ).toContain(input.value);
    } finally {
      vi.useRealTimers();
    }
  });

  it('guarda: PeriodComparisonPanel — default de "Período atual" é o hoje do escopo, não o amanhã UTC', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-01T02:30:00Z')); // 23:30 BRT de 2026-08-31
      const { container } = render(<PeriodComparisonPanel unitId="u1" />);
      const inputs = container.querySelectorAll('input[type="date"]');
      const asOfCurrent = inputs[0] as HTMLInputElement; // 1º input = asOfCurrent (default today()); o 2º nasce vazio
      expect(
        ['', '2026-08-31'],
        'default de asOfCurrent às 23:30 BRT de 2026-08-31 deve afirmar o hoje do escopo (ou vazio) — 2026-09-01 é o "amanhã" UTC na posição default do comparativo',
      ).toContain(asOfCurrent.value);
    } finally {
      vi.useRealTimers();
    }
  });

  it('guarda: DailyJournalPanel — default de "Até" é o hoje do escopo, não o amanhã UTC', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-01T02:30:00Z')); // 23:30 BRT de 2026-08-31
      const { container } = render(<DailyJournalPanel unitId="u1" />);
      const inputs = container.querySelectorAll('input[type="date"]');
      const to = inputs[1] as HTMLInputElement; // JSX: "De" (vazio) vem antes de "Até" (default today())
      expect(
        ['', '2026-08-31'],
        'default de "Até" às 23:30 BRT de 2026-08-31 deve afirmar o hoje do escopo (ou vazio) — 2026-09-01 é o "amanhã" UTC: o Livro Diário default pede um intervalo que termina num dia que ainda não existe no escopo',
      ).toContain(to.value);
    } finally {
      vi.useRealTimers();
    }
  });
});
