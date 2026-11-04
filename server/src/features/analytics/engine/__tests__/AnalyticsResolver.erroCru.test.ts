/**
 * ERRO-CRU-AO-CLIENTE (GAP-MAP, dono 2026-11-04) — `resolveChartData` e `resolveChartDetails` devolvem `error` no
 * corpo de um 200 (`analyticsController`). Falha do processador (banco, bug) fica só no log: o texto interno não
 * chega ao cliente.
 */
const INTERNO = 'Invalid `prisma.dynamicTableData.findMany()` invocation: SQLITE_BUSY: database is locked';

const chart = { key: 'k1', processor: 'p1', params: { tableId: 't1' }, options: {} };

jest.mock('../../services/AnalyticsService', () => ({
  analyticsService: { getAllPresetGroupsAsync: jest.fn(async () => [{ charts: [chart] }]) },
}));

jest.mock('../../core', () => ({
  ...jest.requireActual('../../core'),
  getProcessor: jest.fn(() => async () => {
    throw new Error(INTERNO);
  }),
}));

jest.mock('@/lib/factory', () => ({
  getFactory: () => ({
    getDynamicTableService: () => ({
      getTablesForUser: jest.fn(async () => []),
      getTableById: jest.fn(async () => ({ id: 't1', schema: { fields: [] } })),
      getAllTableData: jest.fn(async () => []),
      getTableDataStream: async function* () {
        yield [];
      },
    }),
  }),
}));

import { resolveChartData, resolveChartDetails } from '../AnalyticsResolver';
import type { UserContext } from '@/types/UserContext';

const user = { id: 'u1', userId: 'u1', timeZone: 'UTC' } as unknown as UserContext;

describe('AnalyticsResolver — erro cru não chega ao cliente', () => {
  it('resolveChartData: processador falha ⇒ `error` sem o texto interno', async () => {
    const r = await resolveChartData(user, 'k1');
    expect(r.error).toBeDefined();
    expect(r.error).not.toContain('prisma');
    expect(r.error).not.toContain('SQLITE_BUSY');
  });

  it('resolveChartDetails: processador falha ⇒ `error` sem o texto interno', async () => {
    const r = await resolveChartDetails(user, 'k1', 'ponto');
    expect(r.error).toBeDefined();
    expect(r.error).not.toContain('prisma');
    expect(r.error).not.toContain('SQLITE_BUSY');
  });
});
