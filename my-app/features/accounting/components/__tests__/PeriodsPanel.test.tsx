import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The component under test uses jsx:"preserve" + esbuild's classic runtime, so its
// JSX compiles to bare `React.createElement` with React expected in scope. Unlike the
// panels that `import React`, this one doesn't — expose it globally for the render.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { PeriodsPanel } from '../PeriodsPanel';
import { accountingService, type AccountingPeriod } from '../../../../lib/services/accounting.service';

vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: {
    listPeriods: vi.fn(),
    seedYear: vi.fn(),
    openPeriod: vi.fn(),
    softClosePeriod: vi.fn(),
    hardClosePeriod: vi.fn(),
    reopenPeriod: vi.fn(),
    closeExercise: vi.fn(),
  },
}));

const period = (month: number, status: AccountingPeriod['status']): AccountingPeriod => ({
  id: `p${month}`, userId: 'o1', unitId: 'u1', year: 2026, month, status,
  openedAt: null, closedAt: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
});

describe('PeriodsPanel (render)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('offers to seed the year when no periods exist', async () => {
    vi.mocked(accountingService.listPeriods).mockResolvedValue([]);

    render(<PeriodsPanel unitId="u1" />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Semear/ })).toBeInTheDocument());
    expect(screen.getByText(/Nenhum período criado/)).toBeInTheDocument();
  });

  it('renders the twelve-month grid with a status chip for a loaded period', async () => {
    vi.mocked(accountingService.listPeriods).mockResolvedValue([period(1, 'OPEN')]);

    render(<PeriodsPanel unitId="u1" />);

    // Jan is OPEN → "Aberto" chip + its "Fechar parcial" action; other months stay FUTURE.
    await waitFor(() => expect(screen.getByText('Aberto')).toBeInTheDocument());
    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Dez')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fechar parcial/ })).toBeInTheDocument();
  });

  it('shows "Encerrar exercício" always — even with no periods created (FORK 1: no client-side period gate)', async () => {
    vi.mocked(accountingService.listPeriods).mockResolvedValue([]);

    render(<PeriodsPanel unitId="u1" />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Encerrar exercício/ })).toBeInTheDocument());
  });

  it('opens the CloseExerciseModal on click, without calling closeExercise until confirmed', async () => {
    vi.mocked(accountingService.listPeriods).mockResolvedValue([period(1, 'OPEN')]);

    render(<PeriodsPanel unitId="u1" />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Encerrar exercício/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Encerrar exercício/ }));

    expect(await screen.findByText(/zera as contas de Receita e Despesa/)).toBeInTheDocument();
    expect(accountingService.closeExercise).not.toHaveBeenCalled();
  });
});
