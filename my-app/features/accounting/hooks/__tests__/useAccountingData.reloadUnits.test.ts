import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

/**
 * Achado do revisor no #1263 (e69d): o banner de erro da `AccountingView` chama `reload`. Quando a falha é ao carregar
 * as UNIDADES, `unitId` fica '' e o `reload` antigo (`loadReport('')`) saía sem fazer nada: o botão "Tentar novamente"
 * aparecia e não tinha efeito. Agora, sem unidade escolhida, `reload` busca as unidades de novo.
 */

const getTables = vi.fn();
const getTableData = vi.fn();
const getTrialBalance = vi.fn();

vi.mock('../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: {
    getTables: (...a: unknown[]) => getTables(...a),
    getTableData: (...a: unknown[]) => getTableData(...a),
  },
}));
vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { getTrialBalance: (...a: unknown[]) => getTrialBalance(...a) },
}));
const tRef = { current: (_k: string, d: string) => d };
vi.mock('../../lib/useAccountingT', () => ({
  useAccountingT: () => ({ tRef }),
}));

import { useAccountingData } from '../useAccountingData';

describe('useAccountingData — reload após falha ao carregar as unidades', () => {
  beforeEach(() => {
    getTables.mockReset();
    getTableData.mockReset();
    getTrialBalance.mockReset();
    getTrialBalance.mockResolvedValue(null);
  });

  it('reload busca as unidades de novo, limpa o erro e escolhe a primeira unidade', async () => {
    getTables.mockRejectedValueOnce(new Error('rede'));
    getTables.mockResolvedValue({ data: [{ id: 'tbl-units', name: 'Units', internalName: 'units' }] });
    getTableData.mockResolvedValue({ data: [{ id: 'row-1', data: { name: 'Salão Centro' } }] });

    const { result } = renderHook(() => useAccountingData());
    await waitFor(() => expect(result.current.error).toBe('Falha ao carregar as unidades.'));
    expect(result.current.unitId).toBe('');

    await act(async () => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.unitId).toBe('row-1'));
    expect(getTables).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(result.current.units).toEqual([{ id: 'row-1', label: 'Salão Centro' }]);
  });

  it('controle: com unidade escolhida, reload só refaz o balancete (não busca unidades)', async () => {
    getTables.mockResolvedValue({ data: [{ id: 'tbl-units', name: 'Units', internalName: 'units' }] });
    getTableData.mockResolvedValue({ data: [{ id: 'row-1', data: { name: 'Salão Centro' } }] });

    const { result } = renderHook(() => useAccountingData());
    await waitFor(() => expect(result.current.unitId).toBe('row-1'));
    await waitFor(() => expect(getTrialBalance).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.reload();
    });

    await waitFor(() => expect(getTrialBalance).toHaveBeenCalledTimes(2));
    expect(getTables).toHaveBeenCalledTimes(1);
  });

  it('R1 (rodada 2): sem unidades próprias e SEM falha, reload NÃO refaz a busca nem religa loadingUnits', async () => {
    // Contador sem unidades próprias no modo cliente: unitId fica '' de propósito (não houve erro). O reload vem dos
    // painéis (onLedgerChange etc.); refazer a busca religaria `loadingUnits` e tiraria o livro do cliente da tela.
    getTables.mockResolvedValue({ data: [{ id: 'tbl-units', name: 'Units', internalName: 'units' }] });
    getTableData.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useAccountingData());
    await waitFor(() => expect(result.current.loadingUnits).toBe(false));
    expect(result.current.unitId).toBe('');
    expect(result.current.error).toBeNull();

    await act(async () => {
      result.current.reload();
    });

    expect(getTables).toHaveBeenCalledTimes(1);
    expect(result.current.loadingUnits).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
