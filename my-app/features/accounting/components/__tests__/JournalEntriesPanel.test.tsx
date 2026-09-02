import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The component under test uses jsx:"preserve" + esbuild's classic runtime, so its
// JSX compiles to bare `React.createElement` with React expected in scope. Unlike the
// panels that `import React`, this one doesn't — expose it globally for the render.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { JournalEntriesPanel } from '../JournalEntriesPanel';
import {
  accountingService,
  type JournalEntryWithFullPostings,
} from '../../../../lib/services/accounting.service';

vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: {
    listEntries: vi.fn(),
    reverseEntry: vi.fn(),
    downloadReceipt: vi.fn(),
  },
}));

const entry: JournalEntryWithFullPostings = {
  id: 'e1', userId: 'o1', unitId: 'u1', date: '2026-06-01', description: 'Venda à vista',
  status: 'Posted', sourceType: 'Manual', sourceId: null, reversedById: null,
  fiscalYear: 2026, entryNumber: 1, version: 1, contentHash: 'h1',
  createdById: 'o1', submittedById: 'o1', approvedById: 'o1',
  createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
  postings: [
    { id: 'p1', userId: 'o1', unitId: 'u1', entryId: 'e1', accountId: 'a1', debitCents: 100000, creditCents: 0, createdAt: '2026-06-01T00:00:00Z', account: { code: '1.1.1', name: 'Caixa' } },
    { id: 'p2', userId: 'o1', unitId: 'u1', entryId: 'e1', accountId: 'a2', debitCents: 0, creditCents: 100000, createdAt: '2026-06-01T00:00:00Z', account: { code: '3.1', name: 'Receita' } },
  ],
};

describe('JournalEntriesPanel (render)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('shows the empty state when there are no entries', async () => {
    vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [], total: 0 });

    render(<JournalEntriesPanel unitId="u1" />);

    await waitFor(() => expect(screen.getByText(/Nenhum lançamento postado/)).toBeInTheDocument());
    // Guarda da classe `t`-instável — ver features/accounting/lib/useAccountingT.
    expect(accountingService.listEntries).toHaveBeenCalledTimes(1);
  });

  it('renders an entry row with its total and a reverse action', async () => {
    vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [entry], total: 1 });

    const { container } = render(<JournalEntriesPanel unitId="u1" />);

    await waitFor(() => expect(screen.getByText('Venda à vista')).toBeInTheDocument());
    // Fiscal number 2026/0001, debit total 100000 cents → "1.000,00", Posted badge.
    expect(screen.getByText('2026/0001')).toBeInTheDocument();
    expect(screen.getByText('Postado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Estornar/ })).toBeInTheDocument();
    expect(container.textContent).toContain('1.000,00');
    expect(container.textContent).not.toContain('NaN');
  });

  it('clicking "Recibo (PDF)" calls accountingService.downloadReceipt with the entry and unit id', async () => {
    vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [entry], total: 1 });
    vi.mocked(accountingService.downloadReceipt).mockResolvedValue(undefined);

    render(<JournalEntriesPanel unitId="u1" />);

    await waitFor(() => expect(screen.getByText('Venda à vista')).toBeInTheDocument());
    const receiptButton = screen.getByRole('button', { name: /Recibo \(PDF\)/ });
    fireEvent.click(receiptButton);

    await waitFor(() => expect(accountingService.downloadReceipt).toHaveBeenCalledTimes(1));
    expect(accountingService.downloadReceipt).toHaveBeenCalledWith('e1', 'u1');
  });

  // ── Teste-guarda (sessão de instrumentação 2026-09-01) — classe date-only UTC shift ──
  // `reversalDate` (JournalEntriesPanel.tsx:204) nasce de `new Date().toISOString().slice(0,10)`
  // (UTC) no initializer do mount: entre 21h-00h BRT o dia UTC já virou e o ESTORNO default
  // nasce datado do "amanhã" do escopo — write-path: reverseEntry aceita a data em silêncio
  // e o estorno grava o dia errado (na última noite do mês, o período seguinte).
  // Comportamento correto (fork-agnóstico): o default afirma o HOJE do escopo — ou vazio.
  // Determinismo: o instante é FIXADO com fake timers só durante o mount (o initializer
  // roda aí); o waitFor posterior usa o clock real (fake timers travariam o waitFor).
  it('guarda: default da data do estorno na janela 21h-00h BRT é o hoje do escopo, não o amanhã UTC', async () => {
    vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [entry], total: 1 });

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-01T02:30:00Z')); // 23:30 BRT de 2026-08-31
      render(<JournalEntriesPanel unitId="u1" />);
    } finally {
      vi.useRealTimers(); // o initializer do useState já rodou no mount
    }

    await waitFor(() => expect(screen.getByRole('button', { name: /Estornar/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Estornar/ }));

    expect(screen.getByText('Data do estorno')).toBeInTheDocument(); // sanidade: o modal abriu
    // O Modal renderiza via createPortal(..., document.body) — `container` do RTL cobre só a
    // árvore montada no baseElement e acha ZERO inputs aqui. Consultar `container` fazia este
    // guarda estourar TypeError ANTES de asserir: ele parecia vermelho "pelo motivo certo" e na
    // verdade nunca testou a data. Consulte o document; a sanidade abaixo mantém isso visível.
    const inputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    expect(inputs.length).toBeGreaterThanOrEqual(1); // sanidade: a data do estorno existe
    const input = inputs[0];
    expect(
      ['', '2026-08-31'],
      'default da data do estorno às 23:30 BRT de 2026-08-31 deve afirmar o hoje do escopo (ou vazio) — 2026-09-01 é o "amanhã" UTC: o estorno default grava o razão no dia errado',
    ).toContain(input.value);
  });
});
