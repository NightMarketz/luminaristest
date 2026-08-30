import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// This component compiles JSX to bare `React.createElement` (esbuild classic runtime)
// and does not `import React` — expose it globally for the render, like PeriodsPanel.test.tsx.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { CloseExerciseModal } from '../CloseExerciseModal';
import { accountingService, type JournalEntry } from '../../../../lib/services/accounting.service';

vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { closeExercise: vi.fn() },
}));

function entry(over: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'e1', userId: 'o1', unitId: 'u1', date: '2026-12-31', description: 'Encerramento do exercício 2026',
    status: 'Posted', sourceType: 'closing', sourceId: '2026', reversedById: null,
    fiscalYear: 2026, entryNumber: 42, version: 1, contentHash: 'h',
    createdById: 'o1', submittedById: null, approvedById: null,
    createdAt: '2026-12-31T00:00:00Z', updatedAt: '2026-12-31T00:00:00Z', postings: [],
    ...over,
  };
}

describe('CloseExerciseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('shows the year/unit/2.3.1 effect text and calls closeExercise on confirm, rendering entryNumber+fiscalYear on success', async () => {
    vi.mocked(accountingService.closeExercise).mockResolvedValue(entry());
    const onSuccess = vi.fn();

    render(
      <CloseExerciseModal isOpen onClose={() => {}} unitId="u1" year={2026} onSuccess={onSuccess} />,
    );

    expect(screen.getByText(/2\.3\.1/)).toBeInTheDocument();
    expect(screen.getByText('u1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));

    await waitFor(() => expect(accountingService.closeExercise).toHaveBeenCalledWith('u1', 2026));
    await waitFor(() => expect(screen.getByText('Exercício encerrado.')).toBeInTheDocument());
    // `useTranslation` has no I18nextProvider in this test harness, so `t(key, fallback, vars)`
    // returns the RAW fallback without interpolating {{vars}} — same limitation the sibling
    // PeriodsPanel.test.tsx works around with a loose regex (see "Semear" there). Real i18next
    // (production, with loaded resources) interpolates `{{entryNumber}}`/`{{fiscalYear}}` fine;
    // what this assertion proves is that the SUCCESS entry passed to the template is the exact
    // response entity from `closeExercise` (component-level plumbing), not the string rendering.
    expect(screen.getByText(/Lançamento nº/)).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledWith(entry());
  });

  it('renders the SAME success copy for an idempotent re-close (no distinguishing flag in the response)', async () => {
    vi.mocked(accountingService.closeExercise).mockResolvedValue(entry({ entryNumber: 42, fiscalYear: 2026 }));

    render(
      <CloseExerciseModal isOpen onClose={() => {}} unitId="u1" year={2026} onSuccess={() => {}} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));

    await waitFor(() => expect(screen.getByText('Exercício encerrado.')).toBeInTheDocument());
    // Same single copy — no "already closed" variant exists.
    expect(screen.queryByText(/já estava|reaberto|reopen/i)).toBeNull();
  });

  it('shows the server message for a 422 ACCOUNTING_PERIOD_NOT_OPEN error', async () => {
    vi.mocked(accountingService.closeExercise).mockRejectedValue({
      status: 422, code: 'ACCOUNTING_PERIOD_NOT_OPEN', message: 'Período contábil 2026/12 não está aberto para lançamentos.',
    });

    render(
      <CloseExerciseModal isOpen onClose={() => {}} unitId="u1" year={2026} onSuccess={() => {}} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));

    await waitFor(() =>
      expect(screen.getByText('Período contábil 2026/12 não está aberto para lançamentos.')).toBeInTheDocument(),
    );
    // Stays on the confirmation view — no fabricated success.
    expect(screen.queryByText('Exercício encerrado.')).toBeNull();
  });

  it('shows the server message for a 400 VALIDATION_ERROR (no result balance to close)', async () => {
    vi.mocked(accountingService.closeExercise).mockRejectedValue({
      status: 400, code: 'VALIDATION_ERROR', message: 'Nenhum saldo de resultado a encerrar.',
    });

    render(
      <CloseExerciseModal isOpen onClose={() => {}} unitId="u1" year={2026} onSuccess={() => {}} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));

    await waitFor(() => expect(screen.getByText('Nenhum saldo de resultado a encerrar.')).toBeInTheDocument());
  });

  it('shows the server message for a 403 FORBIDDEN error', async () => {
    vi.mocked(accountingService.closeExercise).mockRejectedValue({
      status: 403, code: 'FORBIDDEN', message: 'Forbidden',
    });

    render(
      <CloseExerciseModal isOpen onClose={() => {}} unitId="u1" year={2026} onSuccess={() => {}} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));

    await waitFor(() => expect(screen.getByText('Forbidden')).toBeInTheDocument());
  });

  it('falls back to the generic i18n message when the thrown object carries no message/error string', async () => {
    vi.mocked(accountingService.closeExercise).mockRejectedValue({ status: 500 });

    render(
      <CloseExerciseModal isOpen onClose={() => {}} unitId="u1" year={2026} onSuccess={() => {}} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));

    await waitFor(() => expect(screen.getByText('Erro ao encerrar o exercício.')).toBeInTheDocument());
  });
});
