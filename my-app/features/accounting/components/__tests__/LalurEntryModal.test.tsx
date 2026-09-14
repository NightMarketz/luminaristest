import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { LalurEntryModal } from '../LalurEntryModal';
import { lalurService, type LalurEntry, type LalurParteBAccount } from '../../../../lib/services/lalur.service';
import type { Account } from '../../../../lib/services/accounting.service';

/**
 * LalurEntryModal (items 7–9): the catalog is loaded per livro × exercício; `indRelacao` conditionals
 * (REGRA_RELACAO_INEXISTENTE p.247 + D-M3) decide which fields RENDER, and the body never carries a key
 * the server would reject (`.strict()`); TIPO P locks indRelacao=1; Parte B options are the livro's
 * tributo only; edit mode locks year/quarter/livro/codigo and PATCHes explicit null.
 */
vi.mock('../../../../lib/services/lalur.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/lalur.service')>();
  return {
    ...actual,
    lalurService: { getCatalog: vi.fn(), createEntry: vi.fn(), updateEntry: vi.fn() },
  };
});

const catalogLalur = [
  { codigo: '7', descricao: 'Custos não dedutíveis', tipo: 'E' as const, tipoLanc: 'A' as const, vigencia: { de: null, ate: null } },
  { codigo: '61', descricao: 'Compensação de prejuízos fiscais', tipo: 'E' as const, tipoLanc: 'P' as const, vigencia: { de: null, ate: null } },
];
const catalogN = [{ codigo: '1', descricao: 'Linha N', tipo: 'E' as const, vigencia: { de: null, ate: null } }];

const parteB = (over: Partial<LalurParteBAccount>): LalurParteBAccount => ({
  id: 'b', userId: 'o1', unitId: 'u1', codCtaB: 'PF', descricao: 'Prejuízo', dtCriacao: '2024-12-31T00:00:00.000Z',
  codPbRfb: '1000', dtLimite: null, codTributo: 'I', saldoIniCents: 0, indSaldoIni: 'D', cnpjSitEsp: null,
  createdById: null, createdAt: '', updatedAt: '', deletedAt: null, ...over,
});
const parteBAccounts = [
  parteB({ id: 'bI', codCtaB: 'PF-I', codTributo: 'I' }),
  parteB({ id: 'bC', codCtaB: 'PF-C', codTributo: 'C' }),
  parteB({ id: 'bDead', codCtaB: 'deleted:x:PF-I2', codTributo: 'I', deletedAt: '2025-01-01T00:00:00.000Z' }),
];
const accounts: Account[] = [
  { id: 'a1', code: '4.1.1', name: 'Despesas gerais', nature: 'Expense', acceptsEntries: true },
  { id: 'aDead', code: '4.9', name: 'Morta', nature: 'Expense', acceptsEntries: true, deletedAt: '2025-01-01' },
];

function renderModal(over: Partial<React.ComponentProps<typeof LalurEntryModal>> = {}) {
  return render(
    <LalurEntryModal isOpen onClose={() => {}} unitId="u1" year={2025} quarter="T01" parteBAccounts={parteBAccounts} accounts={accounts} onSuccess={() => {}} {...over} />,
  );
}

async function pickCode(codigo: string) {
  await waitFor(() => expect(lalurService.getCatalog).toHaveBeenCalled());
  const combo = screen.getByRole('combobox', { name: 'Código da linha (Tabela Dinâmica)' });
  fireEvent.change(combo, { target: { value: codigo } });
  fireEvent.blur(combo);
}

const parteBSelect = () => screen.queryByLabelText(/^Conta da Parte B/);
const accountSelect = () => screen.queryByLabelText(/^Conta contábil/);
const histField = () => screen.queryByLabelText(/^Histórico/);
const indSelect = () => screen.queryByLabelText('Relacionamento (IND_RELACAO)');

describe('LalurEntryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(lalurService.getCatalog).mockImplementation(async (_u, livro) => (livro === 'lalur' || livro === 'lacs' ? catalogLalur : catalogN));
    vi.mocked(lalurService.createEntry).mockResolvedValue({} as LalurEntry);
    vi.mocked(lalurService.updateEntry).mockResolvedValue({} as LalurEntry);
  });

  it('loads the catalog for livro × exercício (pre-filled from the filter) and reloads on livro change', async () => {
    renderModal();
    await waitFor(() => expect(lalurService.getCatalog).toHaveBeenCalledWith('u1', 'lalur', 2025));
    expect(screen.getByLabelText('Trimestre')).toHaveValue('T01');
    expect(screen.queryByLabelText('Exercício')).toBeNull(); // year is locked to the panel filter (read-only box)
    expect(screen.getByText('2025')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Livro'), { target: { value: 'n630' } });
    await waitFor(() => expect(lalurService.getCatalog).toHaveBeenLastCalledWith('u1', 'n630', 2025));
  });

  it('matrix indRelacao × livro: 1 ⇒ Parte B only · 2 ⇒ conta only · 3 ⇒ both · 4 ⇒ none + histórico obrigatório · livro N ⇒ nothing rendered', async () => {
    renderModal();
    await pickCode('7');
    expect(indSelect()).toBeInTheDocument();
    expect(parteBSelect()).toBeNull();
    expect(accountSelect()).toBeNull();

    fireEvent.change(indSelect()!, { target: { value: '1' } });
    expect(parteBSelect()).toBeInTheDocument();
    expect(accountSelect()).toBeNull();
    // only LIVE accounts of the livro's tributo (lalur → I)
    const opts = Array.from((parteBSelect() as HTMLSelectElement).options).map((o) => o.value).filter(Boolean);
    expect(opts).toEqual(['bI']);

    fireEvent.change(indSelect()!, { target: { value: '2' } });
    expect(parteBSelect()).toBeNull();
    expect(accountSelect()).toBeInTheDocument();
    expect(Array.from((accountSelect() as HTMLSelectElement).options).map((o) => o.value).filter(Boolean)).toEqual(['a1']);

    fireEvent.change(indSelect()!, { target: { value: '3' } });
    expect(parteBSelect()).toBeInTheDocument();
    expect(accountSelect()).toBeInTheDocument();

    fireEvent.change(indSelect()!, { target: { value: '4' } });
    expect(parteBSelect()).toBeNull();
    expect(accountSelect()).toBeNull();
    expect(screen.getByText(/^Histórico \(HIST_LAN_LAL\) \*/)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '10,00' } });
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled(); // histórico missing

    // livro N: none of the four fields is rendered (the server's .strict() rejects the key)
    fireEvent.change(screen.getByLabelText('Livro'), { target: { value: 'n630' } });
    expect(indSelect()).toBeNull();
    expect(parteBSelect()).toBeNull();
    expect(accountSelect()).toBeNull();
    expect(histField()).toBeNull();
  });

  it('create lalur indRelacao=1: body carries parteBId and NO accountId/histLancamento keys', async () => {
    renderModal();
    await pickCode('7');
    fireEvent.change(indSelect()!, { target: { value: '1' } });
    fireEvent.change(parteBSelect()!, { target: { value: 'bI' } });
    fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '1.234,56' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(lalurService.createEntry).toHaveBeenCalled());
    expect(lalurService.createEntry).toHaveBeenCalledWith({
      unitId: 'u1', year: 2025, quarter: 'T01', livro: 'lalur', codigo: '7', valorCents: 123456, indRelacao: '1', parteBId: 'bI',
    });
  });

  it('create livro N: body is only unitId/year/quarter/livro/codigo/valorCents', async () => {
    renderModal({ quarter: '' });
    fireEvent.change(screen.getByLabelText('Livro'), { target: { value: 'n630' } });
    await waitFor(() => expect(lalurService.getCatalog).toHaveBeenLastCalledWith('u1', 'n630', 2025));
    await pickCode('1');
    fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '5' } });
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled(); // quarter not chosen
    fireEvent.change(screen.getByLabelText('Trimestre'), { target: { value: 'T03' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(lalurService.createEntry).toHaveBeenCalled());
    expect(lalurService.createEntry).toHaveBeenCalledWith({ unitId: 'u1', year: 2025, quarter: 'T03', livro: 'n630', codigo: '1', valorCents: 500 });
  });

  it('TIPO P (compensação) locks indRelacao=1 (REGRA_IND_RELACAO p.247) and requires the Parte B account', async () => {
    renderModal();
    await pickCode('61');
    expect(indSelect()).toBeDisabled();
    expect(indSelect()).toHaveValue('1');
    expect(screen.getByText(/REGRA_IND_RELACAO/)).toBeInTheDocument();
    expect(parteBSelect()).toBeInTheDocument();
  });

  it('lacs offers only tributo C accounts', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Livro'), { target: { value: 'lacs' } });
    await pickCode('7');
    fireEvent.change(indSelect()!, { target: { value: '1' } });
    expect(Array.from((parteBSelect() as HTMLSelectElement).options).map((o) => o.value).filter(Boolean)).toEqual(['bC']);
  });

  it('server 400 (catalog reason) is shown in full', async () => {
    vi.mocked(lalurService.createEntry).mockRejectedValue({ success: false, error: "Código '7' (Custos não dedutíveis) não vigora em 2025 (DT_INI —, DT_FIM —).", status: 400 });
    renderModal();
    await pickCode('7');
    fireEvent.change(indSelect()!, { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/^Histórico/), { target: { value: 'h' } });
    fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('não vigora em 2025'));
  });

  it('403 on save calls onForbidden (item 11)', async () => {
    vi.mocked(lalurService.createEntry).mockRejectedValue({ success: false, error: 'Você não tem permissão para gerir o e-Lalur.', status: 403 });
    const onForbidden = vi.fn();
    renderModal({ onForbidden });
    await pickCode('7');
    fireEvent.change(indSelect()!, { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/^Histórico/), { target: { value: 'h' } });
    fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onForbidden).toHaveBeenCalledTimes(1));
  });

  it('edit: year/quarter/livro/codigo read-only with "arquive e recrie"; PATCH sends explicit null to clear', async () => {
    const editing: LalurEntry = {
      id: 'e1', userId: 'o1', unitId: 'u1', year: 2025, quarter: 'T02', livro: 'lalur', codigo: '7', valorCents: 200000,
      indRelacao: '1', histLancamento: null, parteBId: 'bI', accountId: null, createdById: null, createdAt: '', updatedAt: '', deletedAt: null,
    };
    renderModal({ editing });
    expect(screen.getByText(/arquive e recrie/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Código da linha (Tabela Dinâmica)' })).toBeNull(); // code locked
    await waitFor(() => expect(screen.getByText('7 · Custos não dedutíveis · A')).toBeInTheDocument());
    expect(screen.getByPlaceholderText('0,00')).toHaveValue('2000,00');
    expect(parteBSelect()).toHaveValue('bI');

    fireEvent.change(indSelect()!, { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/^Histórico/), { target: { value: 'Sem relacionamento' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(lalurService.updateEntry).toHaveBeenCalled());
    expect(lalurService.updateEntry).toHaveBeenCalledWith('e1', {
      unitId: 'u1', valorCents: 200000, indRelacao: '4', parteBId: null, accountId: null, histLancamento: 'Sem relacionamento',
    });
  });
});
