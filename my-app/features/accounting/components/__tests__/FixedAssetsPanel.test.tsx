import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { FixedAssetsPanel } from '../FixedAssetsPanel';
import { fixedAssetsService, type DepreciationRate, type FixedAssetClass } from '../../../../lib/services/fixedAssets.service';
import { accountingService, type Account } from '../../../../lib/services/accounting.service';

/**
 * FixedAssetsPanel + seções Classes / Taxas / Contas (FE-INCR-FIXED-ASSETS itens 1, 20–26, 32): as 4 seções; classe
 * não depreciável esconde a conta acumulada e NÃO a envia; remover classe com bem vivo mostra o 400 do BE; "Contas"
 * envia SÓ os 3 campos do imobilizado (PUT parcial); taxa nova converte % → basis points e exige justificativa;
 * "ocultar" nunca apaga; `includeHidden` só como "true".
 */
vi.mock('../../../../lib/services/fixedAssets.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/fixedAssets.service')>();
  return {
    ...actual,
    fixedAssetsService: {
      listAssets: vi.fn(), listClasses: vi.fn(), createClass: vi.fn(), updateClass: vi.fn(), deleteClass: vi.fn(),
      listRates: vi.fn(), createRate: vi.fn(), hideRate: vi.fn(),
    },
  };
});
vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { getAccounts: vi.fn(), getSettings: vi.fn(), updateSettings: vi.fn() },
}));

const accounts: Account[] = [
  { id: 'a-bem', code: '1.2.1.01', name: 'Máquinas e equipamentos', nature: 'Asset', acceptsEntries: true },
  { id: 'a-acum', code: '1.2.9.01', name: 'Depreciação acumulada', nature: 'Asset', acceptsEntries: true },
  { id: 'a-desp', code: '4.1.1.01', name: 'Despesa de depreciação', nature: 'Expense', acceptsEntries: true },
  { id: 'a-ganho', code: '3.2.1.01', name: 'Ganho na baixa', nature: 'Revenue', acceptsEntries: true },
  { id: 'a-sint', code: '1.2', name: 'Imobilizado (sintética)', nature: 'Asset', acceptsEntries: false },
];
const klass = (over: Partial<FixedAssetClass>): FixedAssetClass => ({
  id: 'c1', code: 'MAQ', name: 'Máquinas', depreciable: true, costAccountId: 'a-bem', accumulatedDepreciationAccountId: 'a-acum', ...over,
});
const rate = (over: Partial<DepreciationRate>): DepreciationRate => ({
  id: 'r1', ncm: '8471', description: 'Computadores', lifeYears: 5, annualRateBp: 2000, source: 'ANEXO_III_IN_1700_2017',
  sourceUrl: 'https://www.in1700.example/anexo-iii', justification: null, hiddenAt: null, ...over,
});

const wire = (fn: unknown, arg = 0) => JSON.parse(JSON.stringify((fn as { mock: { calls: unknown[][] } }).mock.calls[0][arg]));
const dialog = () => screen.getByRole('dialog');
const goTo = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));

describe('FixedAssetsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(fixedAssetsService.listAssets).mockResolvedValue([]);
    vi.mocked(fixedAssetsService.listClasses).mockResolvedValue([klass({})]);
    vi.mocked(fixedAssetsService.listRates).mockResolvedValue([rate({})]);
    vi.mocked(accountingService.getAccounts).mockResolvedValue({ accounts });
    vi.mocked(accountingService.getSettings).mockResolvedValue({
      unitId: 'u1', bankChargeExpenseAccountId: 'a-banco-tarifa', bankChargeIncomeAccountId: null, depreciationExpenseAccountId: 'a-desp',
      disposalGainAccountId: null, disposalLossAccountId: null, depreciationParteBAccountId: null, updatedAt: null,
    });
  });
  // Dreno: respostas em voo não podem aterrissar depois do teardown do jsdom.
  afterEach(async () => { await new Promise((r) => setTimeout(r, 0)); cleanup(); });

  it('4 seções (Bens / Classes / Taxas / Contas); abre em Bens; só contas folha chegam aos selects', async () => {
    render(<FixedAssetsPanel unitId="u1" />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Bens', 'Classes', 'Taxas', 'Contas']);
    expect(screen.getByRole('tab', { name: 'Bens' })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(fixedAssetsService.listAssets).toHaveBeenCalled());

    goTo('Classes');
    fireEvent.click(await screen.findByRole('button', { name: 'Nova classe' }));
    const costSelect = within(dialog()).getByRole('combobox', { name: 'Conta do bem' });
    const labels = within(costSelect).getAllByRole('option').map((o) => o.textContent);
    expect(labels).toContain('1.2.1.01 — Máquinas e equipamentos');
    expect(labels).not.toContain('1.2 — Imobilizado (sintética)');
  });

  it('classe não depreciável esconde a conta acumulada e NÃO a envia; o valor da conta é o id', async () => {
    vi.mocked(fixedAssetsService.createClass).mockResolvedValue(klass({}));
    render(<FixedAssetsPanel unitId="u1" />);
    goTo('Classes');
    fireEvent.click(await screen.findByRole('button', { name: 'Nova classe' }));
    fireEvent.change(within(dialog()).getByLabelText('Código'), { target: { value: 'TER' } });
    fireEvent.change(within(dialog()).getByLabelText('Nome'), { target: { value: 'Terrenos' } });
    fireEvent.change(within(dialog()).getByRole('combobox', { name: 'Conta do bem' }), { target: { value: 'a-bem' } });
    expect(within(dialog()).getByRole('combobox', { name: 'Conta de deprec. acumulada' })).toBeInTheDocument(); // depreciável por default
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: 'Depreciável' }));
    expect(within(dialog()).queryByRole('combobox', { name: 'Conta de deprec. acumulada' })).not.toBeInTheDocument();

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(fixedAssetsService.createClass).toHaveBeenCalled());
    const body = wire(fixedAssetsService.createClass);
    expect(body).toEqual({ unitId: 'u1', code: 'TER', name: 'Terrenos', depreciable: false, costAccountId: 'a-bem' });
    expect(body).not.toHaveProperty('accumulatedDepreciationAccountId');
  });

  it('classe depreciável sem conta acumulada: bloqueia o envio (espelha o superRefine do DTO)', async () => {
    render(<FixedAssetsPanel unitId="u1" />);
    goTo('Classes');
    fireEvent.click(await screen.findByRole('button', { name: 'Nova classe' }));
    fireEvent.change(within(dialog()).getByLabelText('Código'), { target: { value: 'MAQ2' } });
    fireEvent.change(within(dialog()).getByLabelText('Nome'), { target: { value: 'Máquinas 2' } });
    fireEvent.change(within(dialog()).getByRole('combobox', { name: 'Conta do bem' }), { target: { value: 'a-bem' } });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('accumulatedRequired');
    expect(fixedAssetsService.createClass).not.toHaveBeenCalled();
  });

  it('remover classe com bem vivo: o 400 do BE aparece na confirmação', async () => {
    vi.mocked(fixedAssetsService.deleteClass).mockRejectedValue({ error: 'Classe com ativo vivo — não pode ser removida.', status: 400 });
    render(<FixedAssetsPanel unitId="u1" />);
    goTo('Classes');
    const tr = (await screen.findByText('MAQ')).closest('tr') as HTMLElement;
    fireEvent.click(within(tr).getByRole('button', { name: 'Remover' }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Confirmar remoção' }));
    expect(await within(dialog()).findByText('Classe com ativo vivo — não pode ser removida.')).toBeInTheDocument();
    expect(fixedAssetsService.deleteClass).toHaveBeenCalledWith('c1', 'u1');
  });

  it('"Contas": PUT parcial com SÓ os 3 campos do imobilizado (nada de tarifa bancária); valores por id', async () => {
    vi.mocked(accountingService.updateSettings).mockResolvedValue({} as never);
    render(<FixedAssetsPanel unitId="u1" />);
    goTo('Contas');
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Despesa de depreciação' })).toHaveValue('a-desp'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Ganho na baixa' }), { target: { value: 'a-ganho' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(accountingService.updateSettings).toHaveBeenCalled());
    expect(vi.mocked(accountingService.updateSettings).mock.calls[0][0]).toEqual({
      unitId: 'u1', depreciationExpenseAccountId: 'a-desp', disposalGainAccountId: 'a-ganho', disposalLossAccountId: null,
    });
    expect(Object.keys(wire(accountingService.updateSettings)).sort()).toEqual(['depreciationExpenseAccountId', 'disposalGainAccountId', 'disposalLossAccountId', 'unitId']);
    expect(await screen.findByRole('status')).toHaveTextContent('Contas salvas.');
  });

  it('"Taxas": origem + link "fonte"; "mostrar ocultas" pede includeHidden=true; ocultar confirma e nunca apaga', async () => {
    vi.mocked(fixedAssetsService.hideRate).mockResolvedValue(rate({ hiddenAt: '2026-10-03T00:00:00.000Z' }));
    render(<FixedAssetsPanel unitId="u1" />);
    goTo('Taxas');
    const tr = (await screen.findByText('Computadores')).closest('tr') as HTMLElement;
    expect(within(tr).getByText('20%')).toBeInTheDocument();
    expect(within(tr).getByText('ANEXO_III_IN_1700_2017')).toBeInTheDocument();
    expect(within(tr).getByRole('link', { name: 'fonte' })).toHaveAttribute('href', 'https://www.in1700.example/anexo-iii');
    expect(fixedAssetsService.listRates).toHaveBeenLastCalledWith('u1', false);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar ocultas' }));
    await waitFor(() => expect(fixedAssetsService.listRates).toHaveBeenLastCalledWith('u1', true));

    // a recarga desmonta a tabela (loading) — reconsulta a linha em vez de usar a referência velha
    const fresh = (await screen.findByText('Computadores')).closest('tr') as HTMLElement;
    fireEvent.click(within(fresh).getByRole('button', { name: 'Ocultar' }));
    expect(within(dialog()).getByText(/bens que já usam a taxa continuam com o snapshot/)).toBeInTheDocument();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(fixedAssetsService.hideRate).toHaveBeenCalledWith('r1', 'u1'));
  });

  it('"Taxas" — nova taxa CUSTOM: % → basis points; justificativa obrigatória', async () => {
    vi.mocked(fixedAssetsService.createRate).mockResolvedValue(rate({ id: 'r2', source: 'CUSTOM' }));
    render(<FixedAssetsPanel unitId="u1" />);
    goTo('Taxas');
    fireEvent.click(await screen.findByRole('button', { name: 'Nova taxa' }));
    fireEvent.change(within(dialog()).getByLabelText('Descrição'), { target: { value: 'Servidor de borda' } });
    fireEvent.change(within(dialog()).getByLabelText('Vida útil (anos)'), { target: { value: '4' } });
    fireEvent.change(within(dialog()).getByLabelText('Taxa (% a.a.)'), { target: { value: '25' } });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('justificationRequired');
    expect(fixedAssetsService.createRate).not.toHaveBeenCalled();

    fireEvent.change(within(dialog()).getByLabelText('Justificativa (obrigatória)'), { target: { value: 'Laudo técnico' } });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(fixedAssetsService.createRate).toHaveBeenCalled());
    const body = wire(fixedAssetsService.createRate);
    expect(body).toEqual({ unitId: 'u1', description: 'Servidor de borda', lifeYears: 4, annualRateBp: 2500, justification: 'Laudo técnico' });
    expect(body).not.toHaveProperty('ncm');
  });
});
