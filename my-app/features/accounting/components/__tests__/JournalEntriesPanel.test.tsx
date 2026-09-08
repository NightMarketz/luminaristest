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
    verifyAuditChain: vi.fn(),
    listSourceDocuments: vi.fn(),
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

  // ── FE-INCR-AUDIT-PROVENANCE (sessão de feature, F-FEAP-1..7 → (a) ratificados) ──

  describe('Verificar cadeia de auditoria (F-FEAP-1a)', () => {
    it('renders the "Verificar cadeia de auditoria" button', async () => {
      vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [], total: 0 });

      render(<JournalEntriesPanel unitId="u1" />);

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Verificar cadeia de auditoria/ })).toBeInTheDocument(),
      );
      // Nunca automático ao montar (comportamento 4) — só o listEntries do mount, nada de audit.
      expect(accountingService.verifyAuditChain).not.toHaveBeenCalled();
    });

    it('clicking the button calls verifyAuditChain(unitId) and renders the green seal on ok=true', async () => {
      vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [], total: 0 });
      vi.mocked(accountingService.verifyAuditChain).mockResolvedValue({
        ok: true,
        checkedEvents: 3,
        firstSeq: '1',
        lastSeq: '3',
        headHash: 'abc123',
      });

      render(<JournalEntriesPanel unitId="u1" />);
      await waitFor(() => expect(screen.getByRole('button', { name: /Verificar cadeia/ })).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Verificar cadeia/ }));

      await waitFor(() => expect(accountingService.verifyAuditChain).toHaveBeenCalledWith('u1'));
      // O Modal renderiza via createPortal — consultar `document`, não `container` (mesma lição
      // do guarda de data do estorno acima).
      await waitFor(() => expect(document.body.textContent).toContain('Cadeia íntegra'));
      expect(document.body.textContent).toContain('3'); // checkedEvents
      expect(document.body.textContent).toContain('abc123'); // headHash
    });

    it('checkedEvents=0 renders the "no events" message instead of the seal', async () => {
      vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [], total: 0 });
      vi.mocked(accountingService.verifyAuditChain).mockResolvedValue({
        ok: true,
        checkedEvents: 0,
        firstSeq: null,
        lastSeq: null,
        headHash: null,
      });

      render(<JournalEntriesPanel unitId="u1" />);
      await waitFor(() => expect(screen.getByRole('button', { name: /Verificar cadeia/ })).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Verificar cadeia/ }));

      await waitFor(() =>
        expect(document.body.textContent).toContain('Nenhum evento de auditoria neste escopo ainda'),
      );
      expect(document.body.textContent).not.toContain('Cadeia íntegra');
    });

    it.each([
      ['MISSING_GENESIS', 'Evento inicial (gênese) ausente ou fora de posição.'],
      ['SEQ_GAP', 'Lacuna detectada na sequência de eventos.'],
      ['PREV_HASH_MISMATCH', 'O hash do evento anterior não confere'],
      ['HASH_MISMATCH', 'O hash recalculado do evento não confere'],
      ['HEAD_MISMATCH', 'O ponteiro de cabeça da cadeia não confere'],
    ] as const)('ok=false with reason %s renders the red seal + translated reason', async (reason, expectedText) => {
      vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [], total: 0 });
      vi.mocked(accountingService.verifyAuditChain).mockResolvedValue({
        ok: false,
        checkedEvents: 1,
        firstSeq: '1',
        lastSeq: '1',
        headHash: null,
        failure: { seq: '2', reason },
      });

      render(<JournalEntriesPanel unitId="u1" />);
      await waitFor(() => expect(screen.getByRole('button', { name: /Verificar cadeia/ })).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Verificar cadeia/ }));

      await waitFor(() => expect(document.body.textContent).toContain('Cadeia comprometida'));
      // Nunca a string crua do enum (comportamento 7) — só a tradução.
      expect(document.body.textContent).not.toContain(reason);
      expect(document.body.textContent).toContain(expectedText);
    });

    it('a 403 on click shows the error banner and does not open the result modal', async () => {
      vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [], total: 0 });
      vi.mocked(accountingService.verifyAuditChain).mockRejectedValue({
        error: 'Você não tem permissão para ler a trilha de auditoria.',
        status: 403,
      });

      render(<JournalEntriesPanel unitId="u1" />);
      await waitFor(() => expect(screen.getByRole('button', { name: /Verificar cadeia/ })).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Verificar cadeia/ }));

      await waitFor(() =>
        expect(screen.getByText('Você não tem permissão para ler a trilha de auditoria.')).toBeInTheDocument(),
      );
      expect(screen.queryByText('Cadeia íntegra')).not.toBeInTheDocument();
      expect(screen.queryByText('Cadeia comprometida')).not.toBeInTheDocument();
    });
  });

  describe('Proveniência — documentos de origem por linha (F-FEAP-2a)', () => {
    it('renders a "Proveniência" button per row and calls listSourceDocuments with the right entry id', async () => {
      vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [entry], total: 1 });
      vi.mocked(accountingService.listSourceDocuments).mockResolvedValue([]);

      render(<JournalEntriesPanel unitId="u1" />);
      await waitFor(() => expect(screen.getByText('Venda à vista')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Proveniência/ }));

      await waitFor(() => expect(accountingService.listSourceDocuments).toHaveBeenCalledWith('u1', 'e1'));
    });

    it('empty list shows "nenhum documento de origem" (the common case, D5)', async () => {
      vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [entry], total: 1 });
      vi.mocked(accountingService.listSourceDocuments).mockResolvedValue([]);

      render(<JournalEntriesPanel unitId="u1" />);
      await waitFor(() => expect(screen.getByText('Venda à vista')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Proveniência/ }));

      await waitFor(() =>
        expect(document.body.textContent).toContain('Nenhum documento de origem registrado para este lançamento.'),
      );
    });

    it('an item with externalRef + non-null documentDate renders without NaN/Invalid Date', async () => {
      vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [entry], total: 1 });
      vi.mocked(accountingService.listSourceDocuments).mockResolvedValue([
        {
          id: 'l1',
          journalEntryId: 'e1',
          sourceDocumentId: 'sd1',
          createdAt: '2026-06-01T12:00:00.000Z',
          sourceDocument: {
            id: 'sd1',
            sourceType: 'salon.sale.finalized',
            externalRef: 'NFE-12345',
            documentDate: '2026-06-01T00:00:00.000Z',
            description: 'Venda finalizada',
            attachmentId: null,
            createdAt: '2026-06-01T12:00:00.000Z',
          },
        },
      ]);

      render(<JournalEntriesPanel unitId="u1" />);
      await waitFor(() => expect(screen.getByText('Venda à vista')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Proveniência/ }));

      await waitFor(() => expect(document.body.textContent).toContain('NFE-12345'));
      expect(document.body.textContent).toContain('01/06/2026');
      expect(document.body.textContent).not.toContain('NaN');
      expect(document.body.textContent).not.toContain('Invalid Date');
    });

    // Comportamento 12 — o campo é `string | null` de verdade (Prisma `DateTime?`), não
    // "sempre presente". Ex.: SourceDocument de `crm.opportunity.won`, sem `documentDate`.
    it('an item with documentDate: null renders without breaking and without showing a date', async () => {
      vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [entry], total: 1 });
      vi.mocked(accountingService.listSourceDocuments).mockResolvedValue([
        {
          id: 'l2',
          journalEntryId: 'e1',
          sourceDocumentId: 'sd2',
          createdAt: '2026-06-02T09:00:00.000Z',
          sourceDocument: {
            id: 'sd2',
            sourceType: 'crm.opportunity.won',
            externalRef: null,
            documentDate: null,
            description: null,
            attachmentId: null,
            createdAt: '2026-06-02T09:00:00.000Z',
          },
        },
      ]);

      render(<JournalEntriesPanel unitId="u1" />);
      await waitFor(() => expect(screen.getByText('Venda à vista')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Proveniência/ }));

      await waitFor(() => expect(document.body.textContent).toContain('crm.opportunity.won'));
      expect(document.body.textContent).not.toContain('Data do documento');
      expect(document.body.textContent).not.toContain('NaN');
      expect(document.body.textContent).not.toContain('Invalid Date');
    });

    it('an item with attachmentId shows the truncated id as informative text (F-FEAP-6a)', async () => {
      vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [entry], total: 1 });
      vi.mocked(accountingService.listSourceDocuments).mockResolvedValue([
        {
          id: 'l3',
          journalEntryId: 'e1',
          sourceDocumentId: 'sd3',
          createdAt: '2026-06-03T09:00:00.000Z',
          sourceDocument: {
            id: 'sd3',
            sourceType: 'accounts.payable.recognition',
            externalRef: null,
            documentDate: null,
            description: null,
            attachmentId: 'attachment-cuid-1234567890',
            createdAt: '2026-06-03T09:00:00.000Z',
          },
        },
      ]);

      render(<JournalEntriesPanel unitId="u1" />);
      await waitFor(() => expect(screen.getByText('Venda à vista')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Proveniência/ }));

      await waitFor(() => expect(document.body.textContent).toContain('Anexo'));
      expect(document.body.textContent).toContain('attachment-c…'); // truncado, nunca link de download (F-FEAP-6a)
    });

    it('a 403 on click shows the error banner and does not open the provenance modal', async () => {
      vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [entry], total: 1 });
      vi.mocked(accountingService.listSourceDocuments).mockRejectedValue({
        error: 'Você não tem permissão para ler esta trilha.',
        status: 403,
      });

      render(<JournalEntriesPanel unitId="u1" />);
      await waitFor(() => expect(screen.getByText('Venda à vista')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /Proveniência/ }));

      await waitFor(() =>
        expect(screen.getByText('Você não tem permissão para ler esta trilha.')).toBeInTheDocument(),
      );
      expect(screen.queryByText('Documentos de origem')).not.toBeInTheDocument();
    });
  });
});
