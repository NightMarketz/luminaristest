/**
 * TESTE-GUARDA — C4 item 3 (HANDOFF-2026-11-02-delegacao-dono §C4; GAP-MAP "Reconcile manda `reversalPostingDate`
 * datetime"): o `reverse` do reconcile passa `new Date().toISOString()` como `reversalPostingDate`. O contrato do campo
 * é data pura `YYYY-MM-DD` (`ReverseEntrySchema`), e um instante UTC lido como dia recua/avança no fuso do escopo
 * (memória motor-grava-date-como-iso-utc-scopeday-recua-um-dia): às 23:30 de 30/06 em São Paulo o ISO já é 01/07 UTC,
 * e o estorno cai no período de julho.
 *
 * Esperado: o estorno do reconcile vai com o dia civil do escopo, data pura.
 *
 * Unit: `retryOneReconcilePendingItem('sale.cancelled')` com o factory, o Prisma e o repositório de lançamentos
 * dublados — o `reverse` é uma closure interna do job, e este é o caminho exportado que a atravessa. A varredura da
 * fonte cobre a outra closure idêntica (`runAccountingSyncReconcile`), que só roda com o job inteiro.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const mockReverseEntry = jest.fn(async (_scope: unknown, _input: unknown) => ({ reversal: { id: 'rev-1' }, original: { id: 'entry-1' } }));

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: { dynamicTableData: { findFirst: jest.fn(async () => ({ id: 'sale-1', data: { unitId: 'unit-1' } })) } },
}));
jest.mock('../../lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({
    getAccountingSyncService: () => ({}),
    getPostingService: () => ({ reverseEntry: mockReverseEntry }),
    getPackageBalanceService: () => ({ reverseCreditFromSale: async () => 'no_credit' }),
  }),
}));
jest.mock('../../features/accounting/repositories/JournalEntryRepository', () => ({
  JournalEntryRepository: jest.fn().mockImplementation(() => ({
    findBySource: jest.fn(async (_s: unknown, sourceType: string) =>
      sourceType === 'sale.finalized' ? { id: 'entry-1', status: 'Posted' } : null,
    ),
  })),
}));
jest.mock('../../features/packages/repositories/PackageBalanceRepository', () => ({ PackageBalanceRepository: jest.fn() }));
jest.mock('../../lib/logger', () => ({
  __esModule: true,
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), event: jest.fn() },
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), event: jest.fn() },
}));

import { retryOneReconcilePendingItem } from '../accountingSyncReconcile.job';
import { resolveAccountingScopeInternal } from '../../features/accounting/scope/resolveAccountingScopeInternal';

describe('reconcile — o estorno vai com data pura no dia civil do escopo (C4 item 3)', () => {
  afterEach(() => {
    jest.useRealTimers();
    mockReverseEntry.mockClear();
  });

  it('venda cancelada às 23:30 de 30/06 em São Paulo: reversalPostingDate é "2026-06-30", não um ISO de 01/07 UTC', async () => {
    jest.useFakeTimers({ now: new Date('2026-07-01T02:30:00.000Z'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    const scope = resolveAccountingScopeInternal({ userId: 'owner-1' }, 'unit-1');

    const r = await retryOneReconcilePendingItem(scope, { sourceType: 'sale.cancelled', sourceId: 'sale-1' });

    expect(r).toEqual({ outcome: 'resolved' });
    expect(mockReverseEntry).toHaveBeenCalledTimes(1);
    expect((mockReverseEntry.mock.calls[0][1] as { reversalPostingDate: string }).reversalPostingDate).toBe('2026-06-30');
  });

  it('nenhuma closure do job monta reversalPostingDate a partir de um instante ISO', () => {
    const fonte = readFileSync(join(__dirname, '..', 'accountingSyncReconcile.job.ts'), 'utf8');
    const ocorrencias = fonte.match(/reversalPostingDate:[^\n]*/g) ?? [];

    expect(ocorrencias.length).toBeGreaterThanOrEqual(2);
    for (const linha of ocorrencias) expect(linha).not.toMatch(/toISOString\(\)/);
  });
});
