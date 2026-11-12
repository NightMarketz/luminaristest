/**
 * TESTE-GUARDA — INV F-42.1 (PR 1178): devolução de venda SÓ de pacote não tem receita `sale.finalized`; o gate de
 * ordem do `reconcileSaleReturns` só a deixa passar se o job entregar `isAllPackage: true` em `ReturnedSale`. Os testes
 * de `accountingSyncReconcile.test.ts` exercitam o gate com o dublê já pronto; ficava sem prova que as DUAS montagens
 * reais do job (passada `runAccountingSyncReconcile` e re-drive `retryOneReconcilePendingItem`, case `sale.returned`)
 * calculam o `isAllPackage` e que a lista de receita da passada enxerga as Returned classificadas. Sabotagem do revisor:
 * desfazer essas linhas deixava os 53 testes verdes — a devolução de pacote ficaria presa em OPENING_ENTRY_MISSING.
 *
 * Unit: factory, Prisma, repositórios e `loadSalePackageInfo` dublados; a venda é toda de pacote (`kind: 'Package'`) e
 * o razão só tem a abertura `sale.package.sold` (nunca `sale.finalized`).
 */
const mockSync = jest.fn(async (_scope: unknown, event: { sourceType: string; sourceId: string }) => ({
  entryId: `e-${event.sourceType}`,
  status: 'created',
}));
const mockSaleKind = { value: 'Package' };
const mockReportPending = jest.fn(async (_item: unknown) => undefined);

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    dynamicTable: { findMany: jest.fn(async () => [{ id: 'tbl-1', userId: 'owner-1' }]) },
    dynamicTableData: {
      findFirst: jest.fn(async () => ({ id: 'sale-1', data: SALE_DATA })),
      findMany: jest.fn(async () => []),
    },
    customerPackageBalance: { groupBy: jest.fn(async () => []) },
    inventoryItem: { groupBy: jest.fn(async () => []), findMany: jest.fn(async () => []) },
    account: { findFirst: jest.fn(async () => null) },
    posting: { aggregate: jest.fn(async () => ({ _sum: {} })) },
  },
}));
jest.mock('../../lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({
    getDynamicTableRepository: () => ({
      findRowsByFieldValueSince: jest.fn(async (_t: string, _f: string, status: string) =>
        status === 'Returned' ? [{ id: 'sale-1', data: SALE_DATA }] : [],
      ),
    }),
    getAccountingSyncService: () => ({ sync: mockSync }),
    getPostingService: () => ({ reverseEntry: jest.fn() }),
    getPackageBalanceService: () => ({ reverseCreditFromSale: async () => 'no_credit' }),
    getInventoryService: () => ({ recordSaleCogs: jest.fn(), reconcileInventory: jest.fn(async () => ({})) }),
    getReceitaFiscalService: () => ({ vendaRegistrada: jest.fn(async () => true), registrarVenda: jest.fn(), registrarEstorno: jest.fn() }),
    getReceitaFiscalRecebimentoService: () => ({ registrar: jest.fn(), jaRegistrado: jest.fn(async () => true) }),
    getCrmReceivableBridge: () => ({ bookWonOpportunity: jest.fn() }),
  }),
}));
jest.mock('../../features/accounting/repositories/JournalEntryRepository', () => ({
  JournalEntryRepository: jest.fn().mockImplementation(() => ({
    // Só a abertura do pacote existe de início; o que o job posta (sync) passa a existir.
    findBySource: jest.fn(async (_s: unknown, sourceType: string) =>
      sourceType === 'sale.package.sold' || mockSync.mock.calls.some(([, e]) => e.sourceType === sourceType)
        ? { id: 'entry-open', status: 'Posted' }
        : null,
    ),
  })),
}));
jest.mock('../../features/packages/repositories/PackageBalanceRepository', () => ({
  PackageBalanceRepository: jest.fn().mockImplementation(() => ({ findMovement: jest.fn(async () => ({ id: 'mv' })) })),
}));
jest.mock('../JobWatermarkRepository', () => ({
  JobWatermarkRepository: jest.fn().mockImplementation(() => ({ get: jest.fn(async () => null), set: jest.fn(async () => undefined) })),
}));
jest.mock('../../features/accounting/repositories/ReconcilePendingRepository', () => ({
  ReconcilePendingRepository: jest.fn().mockImplementation(() => ({
    upsertPending: (...a: unknown[]) => mockReportPending(a[1]),
    resolvePending: jest.fn(async () => undefined),
  })),
}));
jest.mock('../../features/accounting/sync/bridges/saleItems', () => ({
  loadSalePackageInfo: jest.fn(async () => ({
    kind: mockSaleKind.value,
    packageIds: ['pkg-1'],
    revenueByNature: { serviceReais: 0, productReais: 0 },
    productLines: [],
  })),
  loadPackageValidityDays: jest.fn(async () => null),
  loadSaleRevenueLines: jest.fn(async () => []),
  loadSaleTomadorTipo: jest.fn(async () => null),
}));
jest.mock('../../lib/logger', () => ({
  __esModule: true,
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), event: jest.fn() },
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), event: jest.fn() },
}));

import { retryOneReconcilePendingItem, runAccountingSyncReconcile } from '../accountingSyncReconcile.job';
import { resolveAccountingScopeInternal } from '../../features/accounting/scope/resolveAccountingScopeInternal';

const SALE_DATA = { unitId: 'unit-1', totalAmount: 100, currency: 'BRL', status: 'Returned', returnedAt: '2026-11-10T12:00:00.000Z' };

const returnedEvents = () => mockSync.mock.calls.map(([, e]) => e.sourceType);

describe('reconcile — devolução de venda só de pacote não fica presa em OPENING_ENTRY_MISSING (INV F-42.1)', () => {
  beforeEach(() => {
    mockSync.mockClear();
    mockReportPending.mockClear();
    mockSaleKind.value = 'Package';
  });

  it('re-drive (retryOneReconcilePendingItem, sale.returned): posta a devolução e não pendura', async () => {
    const scope = resolveAccountingScopeInternal({ userId: 'owner-1' }, 'unit-1');
    const r = await retryOneReconcilePendingItem(scope, { sourceType: 'sale.returned', sourceId: 'sale-1' });

    expect(r).toEqual({ outcome: 'resolved' });
    expect(returnedEvents()).toEqual(['sale.returned']);
    expect(mockReportPending).not.toHaveBeenCalled();
  });

  it('passada (runAccountingSyncReconcile): a Returned só de pacote posta sale.returned, não pede receita nem pendura', async () => {
    await runAccountingSyncReconcile();

    // Sem isAllPackage a devolução ficaria bloqueada (nenhum sync) e a lista de receita tentaria 'sale.finalized'.
    expect(returnedEvents()).toEqual(['sale.returned']);
    expect(mockReportPending).not.toHaveBeenCalledWith(expect.objectContaining({ reasonCode: 'OPENING_ENTRY_MISSING' }));
  });

  it('passada: a Returned com receita (não-pacote) sem sale.finalized lança a receita antes da devolução', async () => {
    mockSaleKind.value = 'Service';
    await runAccountingSyncReconcile();

    // A lista de receita da passada inclui as Returned: sem ela a devolução ficaria bloqueada para sempre.
    expect(returnedEvents()).toEqual(['sale.finalized', 'sale.returned']);
  });
});
