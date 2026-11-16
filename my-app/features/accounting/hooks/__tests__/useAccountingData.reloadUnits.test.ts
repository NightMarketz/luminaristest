import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

/**
 * #1263 (e69d), desenho final. Dois propósitos, duas funções:
 *  - `retryUnits` — SÓ o "Tentar novamente" do banner quando a falha foi ao carregar as unidades (`unitsFailed`).
 *  - `reload` — o de sempre: refaz o balancete. É também o onLedgerChange/onSuccess dos painéis e do modal; NUNCA busca
 *    unidades (religar `loadingUnits` tira o livro do cliente da tela no modo contador e remonta os painéis).
 * As rodadas 2 e 3 do revisor acharam as regressões de misturar os dois num `reload` só (estado implícito `unitId` vazio
 * / ref de falha, que o modo cliente também atinge).
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

const UNITS_TABLE = { data: [{ id: 'tbl-units', name: 'Units', internalName: 'units' }] };
const ONE_UNIT = { data: [{ id: 'row-1', data: { name: 'Salão Centro' } }] };

describe('useAccountingData — retryUnits × reload', () => {
  beforeEach(() => {
    getTables.mockReset();
    getTableData.mockReset();
    getTrialBalance.mockReset();
    getTrialBalance.mockResolvedValue(null);
  });

  it('A1: falha ao carregar as unidades marca unitsFailed; retryUnits busca de novo, limpa o erro e escolhe a 1ª unidade', async () => {
    getTables.mockRejectedValueOnce(new Error('rede'));
    getTables.mockResolvedValue(UNITS_TABLE);
    getTableData.mockResolvedValue(ONE_UNIT);

    const { result } = renderHook(() => useAccountingData());
    await waitFor(() => expect(result.current.error).toBe('Falha ao carregar as unidades.'));
    expect(result.current.unitId).toBe('');
    expect(result.current.unitsFailed).toBe(true);

    await act(async () => {
      result.current.retryUnits();
    });

    await waitFor(() => expect(result.current.unitId).toBe('row-1'));
    expect(getTables).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(result.current.unitsFailed).toBe(false);
    expect(result.current.units).toEqual([{ id: 'row-1', label: 'Salão Centro' }]);
  });

  it('C1 (rodada 3): depois de falha nas unidades, reload (painéis/modal) NÃO busca unidades nem religa loadingUnits', async () => {
    getTables.mockRejectedValueOnce(new Error('rede'));
    getTables.mockResolvedValue(UNITS_TABLE);
    getTableData.mockResolvedValue(ONE_UNIT);

    const { result } = renderHook(() => useAccountingData());
    await waitFor(() => expect(result.current.unitsFailed).toBe(true));

    await act(async () => {
      result.current.reload();
    });

    expect(getTables).toHaveBeenCalledTimes(1);
    expect(result.current.loadingUnits).toBe(false);
    expect(result.current.unitId).toBe('');
  });

  it('R1 (rodada 2): sem unidades próprias e SEM falha, reload NÃO refaz a busca nem religa loadingUnits', async () => {
    getTables.mockResolvedValue(UNITS_TABLE);
    getTableData.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useAccountingData());
    await waitFor(() => expect(result.current.loadingUnits).toBe(false));
    expect(result.current.unitId).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.unitsFailed).toBe(false);

    await act(async () => {
      result.current.reload();
    });

    expect(getTables).toHaveBeenCalledTimes(1);
    expect(result.current.loadingUnits).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('retryUnits que dá certo zera unitsFailed (o banner volta a chamar reload num erro de balancete)', async () => {
    getTables.mockRejectedValueOnce(new Error('rede'));
    getTables.mockResolvedValue(UNITS_TABLE);
    getTableData.mockResolvedValue({ data: [] }); // retry OK, mas sem unidades: unitId segue ''

    const { result } = renderHook(() => useAccountingData());
    await waitFor(() => expect(result.current.unitsFailed).toBe(true));

    await act(async () => {
      result.current.retryUnits();
    });

    await waitFor(() => expect(result.current.loadingUnits).toBe(false));
    expect(result.current.unitsFailed).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('controle: com unidade escolhida, reload só refaz o balancete (não busca unidades)', async () => {
    getTables.mockResolvedValue(UNITS_TABLE);
    getTableData.mockResolvedValue(ONE_UNIT);

    const { result } = renderHook(() => useAccountingData());
    await waitFor(() => expect(result.current.unitId).toBe('row-1'));
    await waitFor(() => expect(getTrialBalance).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.reload();
    });

    await waitFor(() => expect(getTrialBalance).toHaveBeenCalledTimes(2));
    expect(getTables).toHaveBeenCalledTimes(1);
  });
});
