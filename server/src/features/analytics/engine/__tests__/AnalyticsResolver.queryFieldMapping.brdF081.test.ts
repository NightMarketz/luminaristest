/**
 * BRD F-08.1 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-08 do inventário de estruturas implícitas).
 *
 * `getAnalyticsData` valida só `key` e repassa `{ ...req.query }` a `resolveChartData`. Lá, o mapeamento de
 * campos (`statusField`, `amountField`, `dateField`, `paymentStatusField`) é conferido contra o schema da
 * tabela só em `chart.params`; depois `processorParams = { ...chart.params, ...params }` deixa a query
 * substituir o mapeamento já conferido. Comportamento esperado: o mapeamento efetivo (preset + query) é o
 * que se confere — campo inexistente vindo da query responde o mesmo `error` do preset e o processador
 * não roda.
 */
const processor = jest.fn(async () => []);
const chart = { key: 'k1', processor: 'p1', params: { tableId: 't1', amountField: 'valor' }, options: {} };

jest.mock('../../services/AnalyticsService', () => ({
  analyticsService: { getAllPresetGroupsAsync: jest.fn(async () => [{ charts: [chart] }]) },
}));

jest.mock('../../core', () => ({
  ...jest.requireActual('../../core'),
  getProcessor: jest.fn(() => processor),
}));

jest.mock('@/lib/factory', () => ({
  getFactory: () => ({
    getDynamicTableService: () => ({
      getTablesForUser: jest.fn(async () => []),
      getTableById: jest.fn(async () => ({ id: 't1', schema: { fields: [{ name: 'valor' }] } })),
      getAllTableData: jest.fn(async () => []),
      getTableDataStream: async function* () {
        yield [];
      },
    }),
  }),
}));

import { resolveChartData } from '../AnalyticsResolver';
import type { UserContext } from '@/types/UserContext';

const user = { id: 'u1', userId: 'u1', timeZone: 'UTC' } as unknown as UserContext;

describe('BRD F-08.1 — mapeamento de campo vindo da query é conferido', () => {
  beforeEach(() => processor.mockClear());

  it('BRD F-08.1 controle: mapeamento do preset válido ⇒ processador roda', async () => {
    const r = await resolveChartData(user, 'k1', { key: 'k1' });
    expect(r.error).toBeUndefined();
    expect(processor).toHaveBeenCalledTimes(1);
  });

  it('BRD F-08.1 query troca amountField por campo inexistente ⇒ error, processador não roda', async () => {
    const r = await resolveChartData(user, 'k1', { key: 'k1', amountField: 'inexistente' });
    expect(r.error).toMatch(/inexistente/);
    expect(processor).not.toHaveBeenCalled();
  });

  it('BRD F-08.1 chave repetida na query (array) ⇒ error, processador não roda', async () => {
    const r = await resolveChartData(user, 'k1', { key: 'k1', amountField: ['valor', 'outro'] });
    expect(r.error).toMatch(/amountField/);
    expect(processor).not.toHaveBeenCalled();
  });
});
