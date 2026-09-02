import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

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

  // ── Teste-guarda (sessão de instrumentação 2026-09-01) — classe date-only UTC shift ──
  // `today()` (CreatePayableModal.tsx:29-31) deriva os defaults de EMISSÃO e VENCIMENTO
  // via `toISOString()` (UTC): entre 21h-00h BRT o dia UTC já virou e a conta default
  // nasce emitida/vencendo no "amanhã" do escopo — write-path silencioso que desloca os
  // buckets do aging e o cálculo de overdue. Comportamento correto (fork-agnóstico): os
  // defaults afirmam o HOJE do escopo — ou vazio, se a correção delegar. Instante FIXADO
  // com fake timers na janela que morde (o initializer roda no mount; determinístico).
  it('guarda: defaults de emissão/vencimento na janela 21h-00h BRT são o hoje do escopo, não o amanhã UTC', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-01T02:30:00Z')); // 23:30 BRT de 2026-08-31
      render(
        <CreatePayableModal isOpen onClose={() => {}} unitId="u1" expenseAccounts={expenseAccounts} onSuccess={() => {}} />,
      );
      // O Modal renderiza via createPortal(..., document.body) — `container` do RTL cobre só a
      // árvore montada no baseElement e acha ZERO inputs aqui. Consultar `container` fazia este
      // guarda estourar TypeError ANTES de asserir: ele parecia vermelho "pelo motivo certo" e na
      // verdade nunca testou a data. Consulte o document; a sanidade abaixo mantém isso visível.
      const inputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
      expect(inputs.length).toBeGreaterThanOrEqual(2); // sanidade: emissão + vencimento
      for (const input of inputs) {
        expect(
          ['', '2026-08-31'],
          'defaults de issueDate/dueDate às 23:30 BRT de 2026-08-31 devem afirmar o hoje do escopo (ou vazio) — 2026-09-01 é o "amanhã" UTC: a conta a pagar default nasce datada do dia errado, deslocando aging e overdue',
        ).toContain(input.value);
      }
    } finally {
      vi.useRealTimers();
    }
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

  // ── Teste-guarda (sessão de instrumentação 2026-09-01) — classe date-only UTC shift ──
  // Espelho do CreatePayableModal: `today()` (CreateReceivableModal.tsx:29-31) deriva os
  // defaults de emissão/vencimento em UTC — na janela 21h-00h BRT a conta a receber
  // default nasce datada do "amanhã" do escopo (desloca aging AR e overdue, em silêncio).
  it('guarda: defaults de emissão/vencimento na janela 21h-00h BRT são o hoje do escopo, não o amanhã UTC', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-01T02:30:00Z')); // 23:30 BRT de 2026-08-31
      render(
        <CreateReceivableModal isOpen onClose={() => {}} unitId="u1" revenueAccounts={revenueAccounts} onSuccess={() => {}} />,
      );
      // O Modal renderiza via createPortal(..., document.body) — `container` do RTL cobre só a
      // árvore montada no baseElement e acha ZERO inputs aqui. Consultar `container` fazia este
      // guarda estourar TypeError ANTES de asserir: ele parecia vermelho "pelo motivo certo" e na
      // verdade nunca testou a data. Consulte o document; a sanidade abaixo mantém isso visível.
      const inputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
      expect(inputs.length).toBeGreaterThanOrEqual(2); // sanidade: emissão + vencimento
      for (const input of inputs) {
        expect(
          ['', '2026-08-31'],
          'defaults de issueDate/dueDate às 23:30 BRT de 2026-08-31 devem afirmar o hoje do escopo (ou vazio) — 2026-09-01 é o "amanhã" UTC: a conta a receber default nasce datada do dia errado, deslocando aging e overdue',
        ).toContain(input.value);
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
