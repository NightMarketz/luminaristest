import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// This panel compiles JSX to bare `React.createElement` (esbuild classic runtime) and does not
// `import React` — expose it globally for the render, like the AccountsPayablePanel test.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { EntryApprovalsPanel } from '../EntryApprovalsPanel';
import { entryApprovalsService, type ApprovalEntry } from '../../../../lib/services/entryApprovals.service';
import { accountingService } from '../../../../lib/services/accounting.service';

vi.mock('../../../../lib/services/entryApprovals.service', () => ({
  entryApprovalsService: {
    listPending: vi.fn(),
    createDraft: vi.fn(),
    updateDraft: vi.fn(),
    submitDraft: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  },
}));

vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: {
    listEntries: vi.fn(),
    getAccounts: vi.fn(),
  },
}));

vi.mock('../../../../lib/services/dimensions.service', () => ({
  dimensionsService: { listCatalog: vi.fn().mockResolvedValue([]) },
}));

function entry(over: Partial<ApprovalEntry> & Pick<ApprovalEntry, 'id' | 'status'>): ApprovalEntry {
  return {
    userId: 'o1',
    unitId: 'u1',
    date: '2026-06-10T00:00:00.000Z',
    description: 'Aluguel de junho',
    sourceType: 'manual',
    sourceId: null,
    reversedById: null,
    fiscalYear: null,
    entryNumber: null,
    version: 1,
    contentHash: null,
    createdById: 'o1',
    submittedById: null,
    approvedById: null,
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
    postings: [
      {
        id: 'p1', userId: 'o1', unitId: 'u1', entryId: over.id, accountId: 'a1',
        debitCents: 150000, creditCents: 0, createdAt: '2026-06-10T00:00:00.000Z',
        account: { code: '4.1.1', name: 'Aluguel' },
      },
      {
        id: 'p2', userId: 'o1', unitId: 'u1', entryId: over.id, accountId: 'a2',
        debitCents: 0, creditCents: 150000, createdAt: '2026-06-10T00:00:00.000Z',
        account: { code: '1.1.1', name: 'Caixa' },
      },
    ],
    ...over,
  } as ApprovalEntry;
}

const draft = entry({ id: 'e-draft', status: 'Draft', version: 3 });
const pending = entry({ id: 'e-pending', status: 'PendingApproval', version: 5, contentHash: 'abc', submittedById: 'o1' });

describe('EntryApprovalsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(accountingService.getAccounts).mockResolvedValue({ accounts: [] });
  });

  it('splits drafts from the pending queue, and drafts come from the entry list (no drafts endpoint)', async () => {
    vi.mocked(accountingService.listEntries).mockResolvedValue({
      // A Posted entry must NOT leak into the drafts table.
      entries: [draft, entry({ id: 'e-posted', status: 'Posted', entryNumber: 7, fiscalYear: 2026 })],
      total: 2,
    });
    vi.mocked(entryApprovalsService.listPending).mockResolvedValue({ entries: [pending], total: 1 });

    render(<EntryApprovalsPanel unitId="u1" />);

    await waitFor(() => expect(screen.getByText('Rascunhos')).toBeInTheDocument());
    // One draft row (Editar/Enviar) and one pending row (Aprovar/Rejeitar).
    expect(screen.getAllByText('Editar')).toHaveLength(1);
    expect(screen.getAllByText('Aprovar')).toHaveLength(1);
    // No money renders as NaN, and no entry number is presented before approval (ACC-015).
    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.queryByText('2026/0007')).toBeNull();
  });

  it('sends the version the row was read at as expectedVersion (ACC-023 CAS)', async () => {
    vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [draft], total: 1 });
    vi.mocked(entryApprovalsService.listPending).mockResolvedValue({ entries: [], total: 0 });
    vi.mocked(entryApprovalsService.submitDraft).mockResolvedValue(draft);

    render(<EntryApprovalsPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Editar')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Enviar'));
    // The modal title and the row button share this wording — the confirm button is the last
    // "Enviar" button in document order (the Modal renders through a portal appended to body).
    await screen.findByText('Enviar para aprovação');
    fireEvent.click(screen.getAllByRole('button', { name: 'Enviar' }).at(-1) as HTMLElement);

    await waitFor(() =>
      expect(entryApprovalsService.submitDraft).toHaveBeenCalledWith('e-draft', {
        unitId: 'u1',
        expectedVersion: 3,
      }),
    );
  });

  it('turns a 409 CONFLICT into the stale-version message, not the generic one', async () => {
    vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [], total: 0 });
    vi.mocked(entryApprovalsService.listPending).mockResolvedValue({ entries: [pending], total: 1 });
    // apiClient throws a PLAIN OBJECT, not an Error.
    vi.mocked(entryApprovalsService.approve).mockRejectedValue({
      code: 'CONFLICT',
      message: 'O lançamento foi modificado por outra operação (versão desatualizada).',
      status: 409,
    });

    render(<EntryApprovalsPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Aguardando aprovação')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Aprovar'));
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar e postar' }));

    expect(await screen.findByText(/Alguém alterou este lançamento/)).toBeInTheDocument();
    // This only proves the refetch fired. What the retry then SENDS is the next test.
    await waitFor(() => expect(entryApprovalsService.listPending).toHaveBeenCalledTimes(2));
  });

  it('the retry after a 409 carries the REFETCHED version, not the stale one', async () => {
    vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [], total: 0 });
    // The refetch is what makes the row fresh: v5 on load, v6 after someone else touched it.
    vi.mocked(entryApprovalsService.listPending)
      .mockResolvedValueOnce({ entries: [pending], total: 1 })
      .mockResolvedValue({ entries: [entry({ id: 'e-pending', status: 'PendingApproval', version: 6, contentHash: 'abc', submittedById: 'o1' })], total: 1 });
    vi.mocked(entryApprovalsService.approve)
      .mockRejectedValueOnce({ code: 'CONFLICT', message: 'versão desatualizada', status: 409 })
      .mockResolvedValue(pending);

    render(<EntryApprovalsPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Aguardando aprovação')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Aprovar'));
    const confirm = await screen.findByRole('button', { name: 'Aprovar e postar' });
    fireEvent.click(confirm);
    await screen.findByText(/Alguém alterou este lançamento/);

    // The modal stays open so the user can retry — and THAT retry must not resend v5.
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar e postar' }));

    await waitFor(() => expect(entryApprovalsService.approve).toHaveBeenCalledTimes(2));
    expect(vi.mocked(entryApprovalsService.approve).mock.calls[1]).toEqual([
      'e-pending',
      { unitId: 'u1', expectedVersion: 6 },
    ]);
  });

  it('closes the modal when the conflicting row left the screen (someone else approved it)', async () => {
    vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [], total: 0 });
    vi.mocked(entryApprovalsService.listPending)
      .mockResolvedValueOnce({ entries: [pending], total: 1 })
      // The refetch comes back empty: the entry is Posted and no longer in the queue.
      .mockResolvedValue({ entries: [], total: 0 });
    vi.mocked(entryApprovalsService.approve).mockRejectedValue({
      code: 'CONFLICT',
      message: 'versão desatualizada',
      status: 409,
    });

    render(<EntryApprovalsPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Aguardando aprovação')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Aprovar'));
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar e postar' }));

    // The message survives at page level, and no confirm button is left to resend a dead version.
    expect(await screen.findByText(/Alguém alterou este lançamento/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Aprovar e postar' })).toBeNull());
    expect(entryApprovalsService.approve).toHaveBeenCalledTimes(1);
  });

  it('only approve moves the ledger (submit/reject must not refetch the trial balance)', async () => {
    const onLedgerChange = vi.fn();
    vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [], total: 0 });
    vi.mocked(entryApprovalsService.listPending).mockResolvedValue({ entries: [pending], total: 1 });
    vi.mocked(entryApprovalsService.reject).mockResolvedValue(pending);

    render(<EntryApprovalsPanel unitId="u1" onLedgerChange={onLedgerChange} />);
    await waitFor(() => expect(screen.getByText('Rejeitar')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Rejeitar'));
    fireEvent.click(await screen.findByText('Confirmar rejeição'));

    await waitFor(() =>
      expect(entryApprovalsService.reject).toHaveBeenCalledWith('e-pending', { unitId: 'u1', expectedVersion: 5 }),
    );
    expect(onLedgerChange).not.toHaveBeenCalled();
  });

  it('editing a draft pre-fills the legs and saves through updateDraft with expectedVersion', async () => {
    vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [draft], total: 1 });
    vi.mocked(entryApprovalsService.listPending).mockResolvedValue({ entries: [], total: 0 });
    vi.mocked(accountingService.getAccounts).mockResolvedValue({
      accounts: [
        { id: 'a1', code: '4.1.1', name: 'Aluguel', nature: 'Expense', acceptsEntries: true },
        { id: 'a2', code: '1.1.1', name: 'Caixa', nature: 'Asset', acceptsEntries: true },
      ],
    });
    vi.mocked(entryApprovalsService.updateDraft).mockResolvedValue(draft);

    render(<EntryApprovalsPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Editar')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => expect(screen.getByText('Editar Rascunho')).toBeInTheDocument());
    // Pre-filled from the persisted legs — R$ 1.500,00 in BR decimal form, both sides.
    expect(screen.getAllByDisplayValue('1500,00')).toHaveLength(2);

    fireEvent.click(screen.getByText('Salvar rascunho'));

    await waitFor(() =>
      expect(entryApprovalsService.updateDraft).toHaveBeenCalledWith(
        'e-draft',
        expect.objectContaining({
          unitId: 'u1',
          expectedVersion: 3,
          date: '2026-06-10',
          lines: [
            { accountCode: '4.1.1', debitCents: 150000, creditCents: 0 },
            { accountCode: '1.1.1', debitCents: 0, creditCents: 150000 },
          ],
        }),
      ),
    );
  });

  // Regressão: editar um rascunho etiquetado APAGAVA as etiquetas de dimensão.
  // `updateDraft` reescreve todas as pernas (`deleteByEntryId` + `writeLegs`) e
  // `posting_dimensions` tem `onDelete: Cascade` — então o que a tela não devolve é destruído.
  // A causa raiz era a LEITURA: `findManyByUnit` incluía só `account`, e sem a etiqueta no
  // payload o editor não tinha como reenviá-la. Este teste falha se qualquer elo da cadeia
  // (include do repo → tipo do serviço → `toDraftValue` → `toLines`) parar de carregar a tag.
  it('an edit ROUND-TRIPS the legs dimension tags instead of dropping them', async () => {
    const tagged = entry({ id: 'e-draft', status: 'Draft', version: 3 });
    // Perna 1 etiquetada em dois eixos; perna 2 sem etiqueta (o caso misto é o que discrimina:
    // um conserto que carimbasse todas as pernas com a mesma tag passaria num caso homogêneo).
    tagged.postings[0].dimensions = [
      { definitionId: 'cc', valueId: 'cc-vendas' },
      { definitionId: 'proj', valueId: 'proj-alpha' },
    ];

    vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [tagged], total: 1 });
    vi.mocked(entryApprovalsService.listPending).mockResolvedValue({ entries: [], total: 0 });
    vi.mocked(accountingService.getAccounts).mockResolvedValue({
      accounts: [
        { id: 'a1', code: '4.1.1', name: 'Aluguel', nature: 'Expense', acceptsEntries: true },
        { id: 'a2', code: '1.1.1', name: 'Caixa', nature: 'Asset', acceptsEntries: true },
      ],
    });
    vi.mocked(entryApprovalsService.updateDraft).mockResolvedValue(tagged);

    render(<EntryApprovalsPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Editar')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => expect(screen.getByText('Editar Rascunho')).toBeInTheDocument());

    // Salva SEM tocar em nenhum seletor — é exatamente o gesto que perdia as etiquetas.
    fireEvent.click(screen.getByText('Salvar rascunho'));

    await waitFor(() =>
      expect(entryApprovalsService.updateDraft).toHaveBeenCalledWith(
        'e-draft',
        expect.objectContaining({
          lines: [
            {
              accountCode: '4.1.1',
              debitCents: 150000,
              creditCents: 0,
              dimensions: ['cc-vendas', 'proj-alpha'],
            },
            // Perna sem etiqueta continua SEM a chave — o payload não inventa tag.
            { accountCode: '1.1.1', debitCents: 0, creditCents: 150000 },
          ],
        }),
      ),
    );
  });

  // FRENTE 5: the pending queue now has real server-side pagination — it has its own
  // status-scoped endpoint with a per-status `total` (unlike drafts, which stay on the
  // single capped page — see the ponytail note at the fetch site).
  it('paginates the pending queue server-side: "Next" requests page=2', async () => {
    vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [], total: 0 });
    vi.mocked(entryApprovalsService.listPending).mockResolvedValue({ entries: [pending], total: 51 });

    render(<EntryApprovalsPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Aguardando aprovação')).toBeInTheDocument());
    expect(entryApprovalsService.listPending).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, limit: 50 }),
    );

    fireEvent.click(screen.getByTitle('Next'));

    await waitFor(() =>
      expect(entryApprovalsService.listPending).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );
  });

  it('approving the last row on a page beyond page 1 steps back a page instead of showing a false empty state', async () => {
    const pendingPage2 = entry({ id: 'e-pending-2', status: 'PendingApproval', version: 1, submittedById: 'o1' });
    vi.mocked(accountingService.listEntries).mockResolvedValue({ entries: [], total: 0 });
    vi.mocked(entryApprovalsService.listPending)
      .mockResolvedValueOnce({ entries: [pending], total: 51 }) // page 1
      .mockResolvedValueOnce({ entries: [pendingPage2], total: 51 }) // page 2 (its only row)
      .mockResolvedValue({ entries: [pending], total: 50 }); // back on page 1 after approve
    vi.mocked(entryApprovalsService.approve).mockResolvedValue(pendingPage2);

    render(<EntryApprovalsPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Aguardando aprovação')).toBeInTheDocument());

    fireEvent.click(screen.getByTitle('Next'));
    await waitFor(() => expect(entryApprovalsService.listPending).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByText('Aprovar'));
    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar e postar' }));

    await waitFor(() => expect(entryApprovalsService.approve).toHaveBeenCalledTimes(1));
    // The 3rd fetch must ask for page 1 again — never resend page 2 (which would come back
    // empty and read as "no pending entries" even though page 1 still has real rows).
    await waitFor(() =>
      expect(entryApprovalsService.listPending).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
      ),
    );
  });
});
