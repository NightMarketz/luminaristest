import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CreatePayableModal } from '../CreatePayableModal';
import { CreateReceivableModal } from '../CreateReceivableModal';
import { formatCents } from '../../lib/formatCents';
import type { Account } from '../../../../lib/services/accounting.service';

// A6-resíduo (docs/accounting/TRIAGEM-AUDIT-2026-08-15.md): the modal parses the
// typed BRL string into amountCents but never echoed the interpreted value back
// to the user — a mis-parsed amount only surfaced after posting. These guards
// assert the interpreted value is now rendered, formatted via the canonical
// formatCents (the same function JournalEntryModal.tsx:455-462 uses).

const expenseAccounts: Account[] = [
  { id: 'e1', code: '4.1.1', name: 'Aluguel', nature: 'Expense', acceptsEntries: true } as Account,
];

const revenueAccounts: Account[] = [
  { id: 'r1', code: '3.1.1', name: 'Serviços', nature: 'Revenue', acceptsEntries: true } as Account,
];

describe('CreatePayableModal — echoes the interpreted amount', () => {
  beforeEach(() => cleanup());

  it('shows the formatCents-formatted value after typing a BRL amount', () => {
    render(
      <CreatePayableModal
        isOpen
        onClose={() => {}}
        unitId="u1"
        expenseAccounts={expenseAccounts}
        onSuccess={() => {}}
      />,
    );
    const amountInput = screen.getByPlaceholderText('0,00');
    fireEvent.change(amountInput, { target: { value: '1.234,56' } });

    expect(screen.getByText((_, el) => el?.textContent === `= ${formatCents(123456)}`)).toBeInTheDocument();
  });
});

describe('CreateReceivableModal — echoes the interpreted amount', () => {
  beforeEach(() => cleanup());

  it('shows the formatCents-formatted value after typing a BRL amount', () => {
    render(
      <CreateReceivableModal
        isOpen
        onClose={() => {}}
        unitId="u1"
        revenueAccounts={revenueAccounts}
        onSuccess={() => {}}
      />,
    );
    const amountInput = screen.getByPlaceholderText('0,00');
    fireEvent.change(amountInput, { target: { value: '1.234,56' } });

    expect(screen.getByText((_, el) => el?.textContent === `= ${formatCents(123456)}`)).toBeInTheDocument();
  });
});
