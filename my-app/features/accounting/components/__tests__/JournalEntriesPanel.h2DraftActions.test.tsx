import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// The panel does not `import React` — expose it globally for the render (my-app/CLAUDE.md).
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor } from '@testing-library/react';
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
    verifyAuditChain: vi.fn(),
    listSourceDocuments: vi.fn(),
  },
}));

// Rascunho do fluxo de aprovação (ADR-INCR-APPROVAL): sem número nem exercício até ser postado.
const draft: JournalEntryWithFullPostings = {
  id: 'd1', userId: 'o1', unitId: 'u1', date: '2026-10-29', description: 'H2 15d rascunho B',
  status: 'Draft', sourceType: 'manual', sourceId: null, reversedById: null,
  fiscalYear: null, entryNumber: null, version: 3, contentHash: 'h1',
  createdById: 'o1', submittedById: null, approvedById: null,
  createdAt: '2026-10-29T00:00:00Z', updatedAt: '2026-10-29T00:00:00Z',
  postings: [
    { id: 'p1', userId: 'o1', unitId: 'u1', entryId: 'd1', accountId: 'a1', debitCents: 3000, creditCents: 0, createdAt: '2026-10-29T00:00:00Z', account: { code: '4.1', name: 'Despesa' } },
    { id: 'p2', userId: 'o1', unitId: 'u1', entryId: 'd1', accountId: 'a2', debitCents: 0, creditCents: 3000, createdAt: '2026-10-29T00:00:00Z', account: { code: '1.1.1.01', name: 'Caixa' } },
  ],
};

/** A ação não é oferecida: o botão não existe na linha OU existe desabilitado (as duas leituras valem). */
function notOffered(name: RegExp): boolean {
  const button = screen.queryByRole('button', { name });
  return button === null || (button as HTMLButtonElement).disabled;
}

// Achado (I) do H2 (RUNBOOK-H2-BROWSER-SIGNOFF passo 15 §e, execução 29/10, build de produção de 455c1a45):
// em Lançamentos, o rascunho B (status "Rascunho", sem nº) mostra "Recibo (PDF)" e "Estornar" habilitados.
// O servidor recusa as duas ações para não-postado (ReceiptService.ts:44 — "Comprovante disponível apenas
// para lançamentos postados."; PostingService.ts:578 — "Apenas lançamentos postados podem ser estornados.").
// Teste-guarda: VERMELHO até a sessão de correção. Autorização: dono em chat 29/10 ("Pode disparar uma
// sessão de correção"; instrumentação antes, escolha "As duas").
describe('JournalEntriesPanel — ações de linha num rascunho (achado I do H2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('I1: uma linha "Rascunho" sem número não oferece "Recibo (PDF)" nem "Estornar"', async () => {
    vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [draft], total: 1 });

    render(<JournalEntriesPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('H2 15d rascunho B')).toBeInTheDocument());
    // Sanidade do setup: a linha é mesmo o rascunho sem número.
    expect(screen.getByText('Rascunho')).toBeInTheDocument();

    const offered = {
      recibo: !notOffered(/Recibo \(PDF\)/),
      estornar: !notOffered(/Estornar/),
    };
    expect(
      offered,
      'rascunho sem número: o servidor recusa recibo e estorno de lançamento não postado — a linha não pode oferecer as duas ações',
    ).toEqual({ recibo: false, estornar: false });
  });

  // Achado da correção do I (PR #988, 29/10): no rascunho, o "Estornar" desabilitado explica o motivo com o
  // tooltip "Lançamento já estornado", que é falso para rascunho. Teste-guarda: VERMELHO até o fix.
  // Autorização: dono em chat 29/10 ("Corrige").
  it('I2: o "Estornar" desabilitado de um rascunho não diz que o lançamento já foi estornado', async () => {
    vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [draft], total: 1 });

    render(<JournalEntriesPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('H2 15d rascunho B')).toBeInTheDocument());
    const button = screen.getByRole('button', { name: /Estornar/ });
    // Sanidade do setup: o botão está desabilitado (correção do I1).
    expect((button as HTMLButtonElement).disabled).toBe(true);

    expect(
      button.getAttribute('title'),
      'rascunho nunca foi estornado — o tooltip do botão desabilitado deve dar o motivo certo (não postado)',
    ).not.toBe('Lançamento já estornado');
  });
});
