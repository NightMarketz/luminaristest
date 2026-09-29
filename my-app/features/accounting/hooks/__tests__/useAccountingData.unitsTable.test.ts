import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

/**
 * Lacuna 2026-09-28 (GAP-MAP): o preset do salão instala `productUnits` ("Product Units") antes
 * de `units` em GET /api/dynamic-tables. O `find` de `useAccountingData` casava a regex de nome
 * `/unidade|units/i` na PRIMEIRA tabela e carregava as linhas de `productUnits` (vazias) →
 * Contabilidade mostrava "Nenhuma unidade". O match exato de `internalName === 'units'` deve
 * vencer a regex, independente da ordem da lista.
 */

const getTables = vi.fn();
const getTableData = vi.fn();

vi.mock('../../../../lib/services/dynamic-table.service', () => ({
  DynamicTableService: {
    getTables: (...a: unknown[]) => getTables(...a),
    getTableData: (...a: unknown[]) => getTableData(...a),
  },
}));
vi.mock('../../../../lib/services/accounting.service', () => ({
  accountingService: { getTrialBalance: vi.fn().mockResolvedValue(null) },
}));
// `tRef` com identidade estável, como o real (useRef) — senão o efeito re-dispara a cada render.
const tRef = { current: (_k: string, d: string) => d };
vi.mock('../../lib/useAccountingT', () => ({
  useAccountingT: () => ({ tRef }),
}));

import { useAccountingData } from '../useAccountingData';

describe('useAccountingData — escolha da tabela de unidades', () => {
  beforeEach(() => {
    getTables.mockReset();
    getTableData.mockReset();
  });

  it('prefere internalName "units" mesmo com "Product Units" antes na lista', async () => {
    getTables.mockResolvedValue({
      data: [
        { id: 'tbl-product-units', name: 'Product Units', internalName: 'productUnits' },
        { id: 'tbl-units', name: 'Units', internalName: 'units' },
      ],
    });
    getTableData.mockImplementation(async (id: string) =>
      id === 'tbl-units' ? { data: [{ id: 'row-1', data: { name: 'Salão Centro' } }] } : { data: [] },
    );

    const { result } = renderHook(() => useAccountingData());
    await waitFor(() => expect(result.current.loadingUnits).toBe(false));

    expect(getTableData).toHaveBeenCalledWith('tbl-units');
    expect(result.current.units).toEqual([{ id: 'row-1', label: 'Salão Centro' }]);
  });
});
