import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { LalurPanel } from '../LalurPanel';
import { lalurService, type LalurEntry, type LalurParteBAccount } from '../../../../lib/services/lalur.service';
import { accountingService } from '../../../../lib/services/accounting.service';

/**
 * LalurPanel (items 1, 3, 4, 6, 10–12): both sub-sections + empty state; rows carry the catalog description
 * and TIPO; counters count the exercício (live entries; live Parte B with dtCriacao ≤ 31/12); quarter/livro
 * filters are client-side over the year's list; 403 hides every write button; archiving a Parte B account
 * with live lines shows the server 400 and offers the related-lines filter (link → sub-section A).
 */
vi.mock('../../../../lib/services/lalur.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/lalur.service')>();
  return {
    ...actual,
    lalurService: {
      listEntries: vi.fn(), listParteB: vi.fn(), getCatalog: vi.fn(), getParteBPadrao: vi.fn(),
      archiveEntry: vi.fn(), archiveParteB: vi.fn(), createEntry: vi.fn(), updateEntry: vi.fn(), createParteB: vi.fn(), updateParteB: vi.fn(),
    },
  };
});
vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { getAccounts: vi.fn() },
}));
vi.mock('../../lib/formatDate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/formatDate')>();
  return { ...actual, scopeToday: () => '2025-09-12' };
});

const acc = (over: Partial<LalurParteBAccount>): LalurParteBAccount => ({
  id: 'b1', userId: 'o1', unitId: 'u1', codCtaB: 'PF-2024', descricao: 'Prejuízo fiscal 2024', dtCriacao: '2024-12-31T00:00:00.000Z',
  codPbRfb: '1000', dtLimite: null, codTributo: 'I', saldoIniCents: 500000, indSaldoIni: 'D', cnpjSitEsp: null,
  createdById: null, createdAt: '', updatedAt: '', deletedAt: null, ...over,
});
const entry = (over: Partial<LalurEntry>): LalurEntry => ({
  id: 'e1', userId: 'o1', unitId: 'u1', year: 2025, quarter: 'T01', livro: 'lalur', codigo: '7', valorCents: 123456,
  indRelacao: '1', histLancamento: 'Custos do trimestre', parteBId: 'b1', accountId: null, createdById: null, createdAt: '', updatedAt: '', deletedAt: null, ...over,
});

describe('LalurPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(lalurService.listEntries).mockResolvedValue([]);
    vi.mocked(lalurService.listParteB).mockResolvedValue([]);
    vi.mocked(lalurService.getCatalog).mockResolvedValue([{ codigo: '7', descricao: 'Custos não dedutíveis', tipo: 'E', tipoLanc: 'A', vigencia: { de: null, ate: null } }]);
    vi.mocked(lalurService.getParteBPadrao).mockResolvedValue([{ codigo: '1000', descricao: 'Prejuízo Fiscal Operacional', tributo: 'I' }]);
    vi.mocked(accountingService.getAccounts).mockResolvedValue({ accounts: [] });
  });

  it('renders the section with both sub-sections, the empty states and the exercício from scopeToday (never UTC)', async () => {
    render(<LalurPanel unitId="u1" />);
    expect(screen.getByText('e-Lalur / e-Lacs')).toBeInTheDocument();
    expect(screen.getByText(/Parte A \(M300\/M350\) · Parte B \(M010\)/)).toBeInTheDocument();
    expect(screen.getByText('Parte B — contas (M010)')).toBeInTheDocument();
    expect(screen.getByText(/Parte A — ajustes/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Nenhum ajuste registrado neste exercício.')).toBeInTheDocument());
    expect(screen.getByText('Nenhuma conta da Parte B cadastrada.')).toBeInTheDocument();
    expect(screen.getByLabelText('Exercício')).toHaveValue('2025');
    expect(lalurService.listEntries).toHaveBeenCalledWith({ unitId: 'u1', year: 2025, includeArchived: false });
    expect(lalurService.listEntries).toHaveBeenCalledTimes(1); // guarda da classe `t`-instável
    expect(screen.getByRole('button', { name: /Novo ajuste/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nova conta da Parte B/ })).toBeInTheDocument();
  });

  it('rows show catalog description + TIPO, the Parte B code, the RFB standard description; counters count the exercício; archived rows are badged and read-only', async () => {
    vi.mocked(lalurService.listParteB).mockResolvedValue([
      acc({}),
      acc({ id: 'bFuture', codCtaB: 'PF-2026', dtCriacao: '2026-03-31T00:00:00.000Z' }), // nasce depois do exercício
      acc({ id: 'bDead', codCtaB: 'deleted:bDead:PF-OLD', deletedAt: '2025-01-01T00:00:00.000Z' }),
    ]);
    vi.mocked(lalurService.listEntries).mockResolvedValue([
      entry({}),
      entry({ id: 'e2', quarter: 'T02', codigo: 'deleted:e2:7', deletedAt: '2025-05-01T00:00:00.000Z' }),
    ]);
    render(<LalurPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Custos não dedutíveis')).toBeInTheDocument());
    expect(lalurService.getCatalog).toHaveBeenCalledWith('u1', 'lalur', 2025);
    // no i18next instance here ⇒ `{{vars}}` stay raw; the numbers are asserted through the data-* mirror
    const counters = screen.getByTestId('lalur-counters');
    expect(counters).toHaveAttribute('data-entries', '1'); // e2 is archived
    expect(counters).toHaveAttribute('data-accounts', '1'); // bFuture nasce em 2026, bDead arquivada
    expect(screen.getAllByText('Prejuízo Fiscal Operacional')).toHaveLength(3); // RFB standard description, from PARTEB_PADRAO
    expect(screen.getAllByText('31/12/2024')).toHaveLength(2); // b1 + bDead — date-only, no UTC shift

    const liveRow = screen.getByText('Custos não dedutíveis').closest('tr')!;
    expect(within(liveRow).getByText('A')).toBeInTheDocument(); // TIPO from the catalog
    expect(within(liveRow).getByText('PF-2024')).toBeInTheDocument();
    expect(within(liveRow).getByRole('button', { name: /Arquivar/ })).toBeInTheDocument();

    const deadRow = screen.getByText('deleted:e2:7').closest('tr')!;
    expect(within(deadRow).getByText('arquivada')).toBeInTheDocument();
    expect(within(deadRow).queryByRole('button')).toBeNull();
  });

  it('quarter/livro filters narrow the table client-side without refetching', async () => {
    vi.mocked(lalurService.listEntries).mockResolvedValue([entry({}), entry({ id: 'e2', quarter: 'T03', livro: 'n630', codigo: '1', indRelacao: null, parteBId: null })]);
    render(<LalurPanel unitId="u1" />);
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3)); // header + 2
    fireEvent.change(screen.getByLabelText('Trimestre'), { target: { value: 'T03' } });
    expect(screen.getAllByRole('row')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Livro'), { target: { value: 'lalur' } });
    expect(screen.getByText('Nenhum ajuste registrado neste exercício.')).toBeInTheDocument();
    expect(lalurService.listEntries).toHaveBeenCalledTimes(1);
    // "mostrar arquivados" DOES refetch, with includeArchived: true (never 'false' on the wire — service contract)
    fireEvent.click(screen.getAllByLabelText('Mostrar arquivados')[1]);
    await waitFor(() => expect(lalurService.listEntries).toHaveBeenLastCalledWith({ unitId: 'u1', year: 2025, includeArchived: true }));
  });

  it('403 hides every write button (item 11) and shows the error; reading still renders', async () => {
    vi.mocked(lalurService.listParteB).mockResolvedValue([acc({})]);
    vi.mocked(lalurService.listEntries).mockRejectedValue({ success: false, error: 'Você não tem permissão para ler o e-Lalur.', status: 403 });
    render(<LalurPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Você não tem permissão'));
    expect(screen.queryByRole('button', { name: /Novo ajuste/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Nova conta da Parte B/ })).toBeNull();
    await waitFor(() => expect(screen.getByText('PF-2024')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Arquivar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull();
  });

  it('403 from a modal save hides every write button too (onForbidden → readOnly)', async () => {
    vi.mocked(lalurService.listParteB).mockResolvedValue([acc({})]);
    vi.mocked(lalurService.createParteB).mockRejectedValue({ success: false, error: 'Você não tem permissão para gerir o e-Lalur.', status: 403 });
    render(<LalurPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('PF-2024')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Nova conta da Parte B/ }));
    fireEvent.change(screen.getByPlaceholderText('PF-2024'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('Descrição (DESC_CTA_LAL)'), { target: { value: 'd' } });
    await waitFor(() => expect(lalurService.getParteBPadrao).toHaveBeenCalled());
    const combo = screen.getByRole('combobox', { name: 'Código padrão RFB (COD_PB_RFB)' });
    fireEvent.change(combo, { target: { value: '1000' } });
    fireEvent.blur(combo);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(lalurService.createParteB).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('button', { name: /Nova conta da Parte B/ })).toBeNull());
    expect(screen.queryByRole('button', { name: /Novo ajuste/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Arquivar/ })).toBeNull();
  });

  it('archiving a Parte B account with live lines: server 400 shown + link that filters sub-section A by that account', async () => {
    vi.mocked(lalurService.listParteB).mockResolvedValue([acc({}), acc({ id: 'b2', codCtaB: 'OUTRA' })]);
    vi.mocked(lalurService.listEntries).mockResolvedValue([entry({}), entry({ id: 'e2', codigo: '8', parteBId: 'b2' })]);
    vi.mocked(lalurService.archiveParteB).mockRejectedValue({ success: false, error: 'Arquive os ajustes relacionados antes de arquivar a conta da Parte B.', status: 400 });
    render(<LalurPanel unitId="u1" />);
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(3));
    const row = screen.getAllByText('Prejuízo fiscal 2024')[0].closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: /Arquivar/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar arquivamento' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Arquive os ajustes relacionados'));
    expect(lalurService.archiveParteB).toHaveBeenCalledWith('b1', 'u1');

    fireEvent.click(screen.getByRole('button', { name: /Ver os ajustes relacionados/ }));
    const chip = () => screen.getByRole('button', { name: /^Parte B: / }); // `{{code}}` stays raw without i18next
    expect(chip()).toBeInTheDocument();
    // only e1 (parteBId b1) remains in sub-section A
    const tables = screen.getAllByRole('table');
    expect(within(tables[1]).getAllByRole('row')).toHaveLength(2);
    fireEvent.click(chip());
    expect(within(screen.getAllByRole('table')[1]).getAllByRole('row')).toHaveLength(3);
  });

  it('archiving an entry calls the command and refetches', async () => {
    vi.mocked(lalurService.listEntries).mockResolvedValue([entry({})]);
    vi.mocked(lalurService.archiveEntry).mockResolvedValue(entry({ deletedAt: 'x' }));
    render(<LalurPanel unitId="u1" />);
    await waitFor(() => expect(screen.getByText('Custos não dedutíveis')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Arquivar/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar arquivamento' }));
    await waitFor(() => expect(lalurService.archiveEntry).toHaveBeenCalledWith('e1', 'u1'));
    await waitFor(() => expect(lalurService.listEntries).toHaveBeenCalledTimes(2));
  });
});
