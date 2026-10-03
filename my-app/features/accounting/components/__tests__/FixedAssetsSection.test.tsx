import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { FixedAssetsSection } from '../FixedAssetsSection';
import { fixedAssetsService, type FixedAsset, type FixedAssetClass } from '../../../../lib/services/fixedAssets.service';
import type { Account } from '../../../../lib/services/accounting.service';

/**
 * FixedAssetsSection (FE-INCR-FIXED-ASSETS itens 6–7, 10–19, 32): editar/remover só nos status que o BE aceita;
 * ativar/baixar enviam o `version` lido e um 409 de CAS recarrega (nunca reenvia); baixa com valor > 0 sem
 * contrapartida bloqueia o envio; um mês por rodada de depreciação, resultado `posted/skipped` + `failed[]`;
 * `acquiredAt` date-only não volta um dia; o razão avisa o painel pai.
 */
vi.mock('../../../../lib/services/fixedAssets.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/services/fixedAssets.service')>();
  return {
    ...actual,
    fixedAssetsService: {
      listAssets: vi.fn(), runDepreciation: vi.fn(), reconcile: vi.fn(), activateAsset: vi.fn(),
      disposeAsset: vi.fn(), deleteAsset: vi.fn(), listRates: vi.fn(), createAsset: vi.fn(), updateAsset: vi.fn(),
    },
  };
});
vi.mock('../../lib/formatDate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/formatDate')>();
  return { ...actual, scopeToday: () => '2026-10-03' };
});

const classes: FixedAssetClass[] = [
  { id: 'c1', code: 'MAQ', name: 'Máquinas', depreciable: true, costAccountId: 'a1', accumulatedDepreciationAccountId: 'a2' },
];
const accounts: Account[] = [
  { id: 'acc-banco', code: '1.1.1.01', name: 'Banco', nature: 'Asset', acceptsEntries: true },
];
const asset = (over: Partial<FixedAsset>): FixedAsset => ({
  id: 'fa1', unitId: 'u1', classId: 'c1', code: 'PC-01', description: 'Notebook', ncmPrefix: null, quantity: 1,
  costCents: 500000, residualValueCents: 0, rateId: null, annualRateBp: 2000, bookAnnualRateBp: null, bookRateJustification: null,
  openingAccumulatedCents: 0, accumulatedDepreciationCents: 0, status: 'PENDING_ACTIVATION',
  acquiredAt: '2026-03-01T00:00:00.000Z', activatedAt: null, disposedAt: null, disposalEntryId: null, sourceDocumentId: null, payableId: null,
  sourceItemRef: null, version: 1, ...over,
});

const row = (code: string) => screen.getByText(code).closest('tr') as HTMLElement;
const dialog = () => screen.getByRole('dialog');

function renderSection(over: Partial<React.ComponentProps<typeof FixedAssetsSection>> = {}) {
  const props = { unitId: 'u1', classes, accounts, onLedgerChange: vi.fn(), onNavigateToPeriods: vi.fn(), onNavigateToContas: vi.fn(), ...over };
  render(<FixedAssetsSection {...props} />);
  return props;
}

describe('FixedAssetsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(fixedAssetsService.listAssets).mockResolvedValue([]);
  });
  // Dreno: respostas em voo não podem aterrissar depois do teardown do jsdom.
  afterEach(async () => { await new Promise((r) => setTimeout(r, 0)); cleanup(); });

  it('lista: classe resolvida, valor líquido = custo − abertura − acumulada, marca "da NF-e", data date-only sem voltar um dia', async () => {
    vi.mocked(fixedAssetsService.listAssets).mockResolvedValue([
      asset({ id: 'a', code: 'PC-01', status: 'ACTIVE', activatedAt: '2026-03-01T00:00:00.000Z', openingAccumulatedCents: 100000, accumulatedDepreciationCents: 50000, payableId: 'p1' }),
    ]);
    renderSection();
    await screen.findByText('PC-01');
    const tr = row('PC-01');
    expect(within(tr).getByText('Máquinas')).toBeInTheDocument();
    expect(within(tr).getByText(/3\.500,00/)).toBeInTheDocument(); // 5.000 − 1.000 − 500
    expect(within(tr).getByText('da NF-e')).toBeInTheDocument();
    expect(within(tr).getAllByText('01/03/2026')).toHaveLength(2); // aquisição + ativação
    expect(fixedAssetsService.listAssets).toHaveBeenCalledWith({ unitId: 'u1', status: undefined, classId: undefined });
  });

  it('editar/remover/ativar/baixar aparecem só nos status que o BE aceita', async () => {
    vi.mocked(fixedAssetsService.listAssets).mockResolvedValue([
      asset({ id: '1', code: 'P-PEND', status: 'PENDING_ACTIVATION' }),
      asset({ id: '2', code: 'P-ATIVO0', status: 'ACTIVE', accumulatedDepreciationCents: 0 }),
      asset({ id: '3', code: 'P-ATIVOQ', status: 'ACTIVE', accumulatedDepreciationCents: 1000 }),
      asset({ id: '4', code: 'P-TOTAL', status: 'FULLY_DEPRECIATED', accumulatedDepreciationCents: 500000 }),
      asset({ id: '5', code: 'P-BAIXA', status: 'DISPOSED' }),
    ]);
    renderSection();
    await screen.findByText('P-PEND');
    const btns = (code: string) => within(row(code)).queryAllByRole('button').map((b) => b.textContent?.trim());
    expect(btns('P-PEND')).toEqual(['Ativar', 'Editar', 'Remover']);
    expect(btns('P-ATIVO0')).toEqual(['Baixar', 'Remover']);
    expect(btns('P-ATIVOQ')).toEqual(['Baixar']);
    expect(btns('P-TOTAL')).toEqual([]);
    expect(btns('P-BAIXA')).toEqual([]);
  });

  it('filtro de status vai ao servidor; paginação é do cliente (25 por página)', async () => {
    vi.mocked(fixedAssetsService.listAssets).mockResolvedValue(
      Array.from({ length: 30 }, (_, i) => asset({ id: `a${i}`, code: `B-${String(i).padStart(2, '0')}` })),
    );
    renderSection();
    await screen.findByText('B-00');
    expect(screen.getByText('B-24')).toBeInTheDocument();
    expect(screen.queryByText('B-25')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'ACTIVE' } });
    await waitFor(() => expect(fixedAssetsService.listAssets).toHaveBeenLastCalledWith({ unitId: 'u1', status: 'ACTIVE', classId: undefined }));
  });

  it('ativar: o corpo leva o version lido e openingAccumulatedCents (parseBrl); depois recarrega e avisa o razão', async () => {
    vi.mocked(fixedAssetsService.listAssets).mockResolvedValue([asset({ id: 'fa9', code: 'PC-09', version: 7 })]);
    vi.mocked(fixedAssetsService.activateAsset).mockResolvedValue(asset({ status: 'ACTIVE' }));
    const { onLedgerChange } = renderSection();
    await screen.findByText('PC-09');
    fireEvent.click(within(row('PC-09')).getByRole('button', { name: 'Ativar' }));
    fireEvent.change(within(dialog()).getByLabelText('Data de ativação'), { target: { value: '2025-12-01' } });
    fireEvent.change(within(dialog()).getByLabelText('Depreciação acumulada de abertura (R$, opcional)'), { target: { value: '1.234,56' } });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Ativar' }));

    await waitFor(() => expect(fixedAssetsService.activateAsset).toHaveBeenCalled());
    expect(fixedAssetsService.activateAsset).toHaveBeenCalledWith('fa9', {
      unitId: 'u1', assetId: 'fa9', activatedAt: '2025-12-01', openingAccumulatedCents: 123456, version: 7,
    });
    await waitFor(() => expect(onLedgerChange).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fixedAssetsService.listAssets).toHaveBeenCalledTimes(2));
  });

  it('409 de CAS na ativação: mensagem "o bem mudou", recarrega a lista e NÃO reenvia', async () => {
    vi.mocked(fixedAssetsService.listAssets).mockResolvedValue([asset({ id: 'fa9', code: 'PC-09', version: 7 })]);
    vi.mocked(fixedAssetsService.activateAsset).mockRejectedValue({ error: 'version divergente', status: 409 });
    const { onLedgerChange } = renderSection();
    await screen.findByText('PC-09');
    fireEvent.click(within(row('PC-09')).getByRole('button', { name: 'Ativar' }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Ativar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('O bem mudou — lista recarregada.');
    await waitFor(() => expect(fixedAssetsService.listAssets).toHaveBeenCalledTimes(2));
    expect(fixedAssetsService.activateAsset).toHaveBeenCalledTimes(1);
    expect(onLedgerChange).not.toHaveBeenCalled();
  });

  it('baixar com valor > 0 sem contrapartida bloqueia o envio; com contrapartida envia counterpartAccountId + version', async () => {
    vi.mocked(fixedAssetsService.listAssets).mockResolvedValue([asset({ id: 'fa5', code: 'PC-05', status: 'ACTIVE', version: 4 })]);
    vi.mocked(fixedAssetsService.disposeAsset).mockResolvedValue(asset({ status: 'DISPOSED' }));
    renderSection();
    await screen.findByText('PC-05');
    fireEvent.click(within(row('PC-05')).getByRole('button', { name: 'Baixar' }));
    fireEvent.change(within(dialog()).getByLabelText('Data da baixa'), { target: { value: '2026-10-01' } });
    fireEvent.change(within(dialog()).getByLabelText('Valor recebido (R$) — 0 se imprestável'), { target: { value: '800,00' } });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Confirmar baixa' }));

    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('Informe a conta de contrapartida do valor recebido.');
    expect(fixedAssetsService.disposeAsset).not.toHaveBeenCalled();

    fireEvent.change(within(dialog()).getByRole('combobox', { name: 'Conta de contrapartida (onde o valor entrou)' }), { target: { value: 'acc-banco' } });
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Confirmar baixa' }));
    await waitFor(() => expect(fixedAssetsService.disposeAsset).toHaveBeenCalled());
    expect(fixedAssetsService.disposeAsset).toHaveBeenCalledWith('fa5', {
      unitId: 'u1', assetId: 'fa5', disposedAt: '2026-10-01', proceedsCents: 80000, counterpartAccountId: 'acc-banco', version: 4,
    });
  });

  it('baixa imprestável (valor 0): não pede nem envia contrapartida', async () => {
    vi.mocked(fixedAssetsService.listAssets).mockResolvedValue([asset({ id: 'fa5', code: 'PC-05', status: 'ACTIVE', version: 4 })]);
    vi.mocked(fixedAssetsService.disposeAsset).mockResolvedValue(asset({ status: 'DISPOSED' }));
    renderSection();
    await screen.findByText('PC-05');
    fireEvent.click(within(row('PC-05')).getByRole('button', { name: 'Baixar' }));
    expect(within(dialog()).queryByRole('combobox')).not.toBeInTheDocument();
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Confirmar baixa' }));
    await waitFor(() => expect(fixedAssetsService.disposeAsset).toHaveBeenCalled());
    const body = JSON.parse(JSON.stringify(vi.mocked(fixedAssetsService.disposeAsset).mock.calls[0][1]));
    expect(body.proceedsCents).toBe(0);
    expect(body).not.toHaveProperty('counterpartAccountId');
  });

  it('remover: confirmação; o 400 do BE aparece na própria confirmação', async () => {
    vi.mocked(fixedAssetsService.listAssets).mockResolvedValue([asset({ id: 'fa1', code: 'PC-01' })]);
    vi.mocked(fixedAssetsService.deleteAsset).mockRejectedValue({ error: 'já tem quota postada', status: 400 });
    renderSection();
    await screen.findByText('PC-01');
    fireEvent.click(within(row('PC-01')).getByRole('button', { name: 'Remover' }));
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Confirmar remoção' }));
    expect(await within(dialog()).findByText('já tem quota postada')).toBeInTheDocument();
    expect(fixedAssetsService.deleteAsset).toHaveBeenCalledWith('fa1', 'u1');
  });

  it('rodar depreciação: mês anterior ao de hoje por default, UM mês por chamada; resultado + failed[] com link para Períodos', async () => {
    vi.mocked(fixedAssetsService.listAssets).mockResolvedValue([asset({ id: 'fa1', code: 'PC-01', status: 'ACTIVE' })]);
    vi.mocked(fixedAssetsService.runDepreciation).mockResolvedValue({
      yearMonth: '2026-09', posted: 2, skipped: 1, failed: [{ assetId: 'fa1', code: 'PERIOD_NOT_OPEN', message: 'Período 2026-09 fechado.' }],
    });
    const { onLedgerChange, onNavigateToPeriods } = renderSection();
    await screen.findByText('PC-01');
    expect(screen.getByLabelText('Mês de competência')).toHaveValue('2026-09');
    fireEvent.click(screen.getByRole('button', { name: 'Rodar depreciação' }));

    const result = await screen.findByTestId('fa-run-result');
    expect(fixedAssetsService.runDepreciation).toHaveBeenCalledWith({ unitId: 'u1', yearMonth: '2026-09' });
    expect(result).toHaveAttribute('data-posted', '2');
    expect(result).toHaveAttribute('data-skipped', '1');
    expect(result).toHaveTextContent('Período 2026-09 fechado.');
    fireEvent.click(within(result).getByRole('button', { name: 'Abrir períodos' }));
    expect(onNavigateToPeriods).toHaveBeenCalled();
    await waitFor(() => expect(onLedgerChange).toHaveBeenCalledTimes(1));
  });

  it('400 de conta de depreciação não configurada aparece com link para a seção Contas', async () => {
    vi.mocked(fixedAssetsService.runDepreciation).mockRejectedValue({
      error: 'depreciationExpenseAccountId não configurado em AccountingScopeSettings', status: 400,
    });
    const { onNavigateToContas } = renderSection();
    fireEvent.click(await screen.findByRole('button', { name: 'Rodar depreciação' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('depreciationExpenseAccountId não configurado');
    fireEvent.click(within(alert).getByRole('button', { name: 'Configurar as contas do imobilizado' }));
    expect(onNavigateToContas).toHaveBeenCalled();
  });

  it('reconciliar: mostra checked/repaired/draftsCreated e avisa o razão', async () => {
    vi.mocked(fixedAssetsService.reconcile).mockResolvedValue({ checked: 5, repaired: 1, draftsCreated: 2 });
    const { onLedgerChange } = renderSection();
    fireEvent.click(await screen.findByRole('button', { name: 'Reconciliar' }));
    const out = await screen.findByTestId('fa-reconcile-result');
    expect(fixedAssetsService.reconcile).toHaveBeenCalledWith('u1');
    expect(out).toHaveAttribute('data-checked', '5');
    expect(out).toHaveAttribute('data-repaired', '1');
    expect(out).toHaveAttribute('data-drafts', '2');
    await waitFor(() => expect(onLedgerChange).toHaveBeenCalledTimes(1));
  });
});
