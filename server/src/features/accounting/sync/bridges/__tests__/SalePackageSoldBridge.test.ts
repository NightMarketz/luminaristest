import type { AccountingScope } from '../../../scope/AccountingScope';
import type { AccountingEvent } from '../../AccountingSyncPort';

// Mock the bridge's collaborators (factory + logger). resolveAccountingScope,
// buildSalePackageSoldEvent and classifySaleItems are real (classify reads via the
// mocked repository).
const findTableByInternalName = jest.fn();
const findRowsByFieldValue = jest.fn();
const existsByIdInTable = jest.fn();
const findDataById = jest.fn();
const sync = jest.fn();
const creditFromSale = jest.fn();
const loggerWarn = jest.fn();
const loggerError = jest.fn();

jest.mock('../../../../../lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({
    getDynamicTableRepository: () => ({ findTableByInternalName, findRowsByFieldValue, existsByIdInTable, findDataById }),
    getAccountingSyncService: () => ({ sync }),
    getPackageBalanceService: () => ({ creditFromSale }),
  }),
}));
jest.mock('../../../../../lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: (...a: unknown[]) => loggerWarn(...a), error: (...a: unknown[]) => loggerError(...a), debug: jest.fn() },
}));

import { maybeSyncSalePackageSold } from '../SalePackageSoldBridge';

const SALES_TABLE_ID = 'tbl-sales-1';
const actor = { userId: 'u1' };

function salesTable(over: Record<string, unknown> = {}) {
  return { id: SALES_TABLE_ID, internalName: 'sales', category: 'finance', ...over };
}
function finalizedRow(over: Record<string, unknown> = {}) {
  return {
    id: 'sale-1',
    data: { status: 'Finalized', unitId: 'unit-1', customerId: 'cust-1', totalAmount: 500, date: '2026-06-26T00:00:00.000Z', ...over },
  };
}
const packageItems = [{ data: { type: 'Package', packageId: 'pkg-1', saleId: 'sale-1' } }];
const productItems = [{ data: { type: 'Product', productId: 'p-1', saleId: 'sale-1' } }];

describe('SalePackageSoldBridge.maybeSyncSalePackageSold', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findTableByInternalName.mockImplementation(async (_u: string, name: string) =>
      name === 'packages' ? { id: 'tbl-packages', internalName: 'packages' } : salesTable(),
    );
    existsByIdInTable.mockResolvedValue(true);
    findDataById.mockResolvedValue({ id: 'pkg-1', data: { name: 'Pacote 10 escovas', validityDays: 30 } });
    findRowsByFieldValue.mockResolvedValue(packageItems); // all-Package by default
    sync.mockResolvedValue({ entryId: 'entry-pkg-1' });
    creditFromSale.mockResolvedValue(undefined);
  });

  it('syncs an all-Package Finalized sale with sale.package.sold (origin), correct scope/event', async () => {
    await maybeSyncSalePackageSold(actor, SALES_TABLE_ID, finalizedRow());
    expect(sync).toHaveBeenCalledTimes(1);
    const [scope, event] = sync.mock.calls[0] as [AccountingScope, AccountingEvent];
    expect(scope).toMatchObject({ ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1' });
    expect(event).toMatchObject({
      sourceType: 'sale.package.sold',
      sourceId: 'sale-1',
      unitId: 'unit-1',
      amount: 500,
    });
  });

  it('credits the customer balance for the single package (origin), cents-converted', async () => {
    await maybeSyncSalePackageSold(actor, SALES_TABLE_ID, finalizedRow());
    expect(creditFromSale).toHaveBeenCalledTimes(1);
    const [, cmd] = creditFromSale.mock.calls[0];
    // BE-INCR-PACOTE-VALIDADE item 2/3: the catalog's validityDays travels with the credit, and the sale day
    // is the same accounting day the posting uses (scopeDay — an ISO instant is read in the scope's zone).
    expect(cmd).toEqual({
      customerId: 'cust-1',
      packageId: 'pkg-1',
      saleId: 'sale-1',
      amountCents: 50000,
      saleDate: '2026-06-25',
      validityDays: 30,
    });
  });

  it('catálogo sem a linha do pacote → validityDays null + warn (nunca inventa prazo)', async () => {
    existsByIdInTable.mockResolvedValue(false);
    await maybeSyncSalePackageSold(actor, SALES_TABLE_ID, finalizedRow({ date: '2026-06-26' }));
    const [, cmd] = creditFromSale.mock.calls[0];
    expect(cmd).toMatchObject({ saleDate: '2026-06-26', validityDays: null });
    expect(loggerWarn).toHaveBeenCalledWith('Package catalog row not found — no validity applied', { packageId: 'pkg-1' });
  });

  it.each([[-1], [1.5], ['30']])('validityDays inválido (%p) → null + warn', async (bad) => {
    findDataById.mockResolvedValue({ id: 'pkg-1', data: { validityDays: bad } });
    await maybeSyncSalePackageSold(actor, SALES_TABLE_ID, finalizedRow({ date: '2026-06-26' }));
    expect(creditFromSale.mock.calls[0][1]).toMatchObject({ validityDays: null });
    expect(loggerWarn).toHaveBeenCalledWith('Package validityDays is not an integer ≥ 0 — no validity applied', expect.anything());
  });

  it('skips the balance credit (but still posts) when there are multiple distinct packageIds', async () => {
    findRowsByFieldValue.mockResolvedValue([
      { data: { type: 'Package', packageId: 'pkg-1', saleId: 'sale-1' } },
      { data: { type: 'Package', packageId: 'pkg-2', saleId: 'sale-1' } },
    ]);
    await maybeSyncSalePackageSold(actor, SALES_TABLE_ID, finalizedRow());
    expect(sync).toHaveBeenCalledTimes(1); // accounting origin still books
    expect(creditFromSale).not.toHaveBeenCalled(); // but balance credit is skipped + warned
    expect(loggerWarn).toHaveBeenCalled();
  });

  it('skips the balance credit when the sale has no customerId', async () => {
    await maybeSyncSalePackageSold(actor, SALES_TABLE_ID, finalizedRow({ customerId: undefined }));
    expect(creditFromSale).not.toHaveBeenCalled();
  });

  it.each(['Draft', 'Cancelled', 'Returned'])('does NOT sync a sale in status %s', async (status) => {
    await maybeSyncSalePackageSold(actor, SALES_TABLE_ID, finalizedRow({ status }));
    expect(sync).not.toHaveBeenCalled();
  });

  it('ignores a table that is not the tenant sales table (id mismatch)', async () => {
    await maybeSyncSalePackageSold(actor, 'some-other-table', finalizedRow());
    expect(sync).not.toHaveBeenCalled();
  });

  it('ignores when the tenant has no sales table', async () => {
    findTableByInternalName.mockResolvedValueOnce(null);
    await maybeSyncSalePackageSold(actor, SALES_TABLE_ID, finalizedRow());
    expect(sync).not.toHaveBeenCalled();
  });

  it('does NOT sync a Product/Service sale (not all-Package)', async () => {
    findRowsByFieldValue.mockResolvedValue(productItems);
    await maybeSyncSalePackageSold(actor, SALES_TABLE_ID, finalizedRow());
    expect(sync).not.toHaveBeenCalled();
  });

  it('does NOT sync when the sale has no items (Empty)', async () => {
    findRowsByFieldValue.mockResolvedValue([]);
    await maybeSyncSalePackageSold(actor, SALES_TABLE_ID, finalizedRow());
    expect(sync).not.toHaveBeenCalled();
  });

  it('skips (no sync) and warns when an all-Package sale has no unitId', async () => {
    await maybeSyncSalePackageSold(actor, SALES_TABLE_ID, finalizedRow({ unitId: undefined }));
    expect(sync).not.toHaveBeenCalled();
    expect(loggerWarn).toHaveBeenCalled();
  });

  it.each([0, -10, NaN, 'x'])('skips (no sync) when totalAmount is invalid (%s)', async (totalAmount) => {
    await maybeSyncSalePackageSold(actor, SALES_TABLE_ID, finalizedRow({ totalAmount }));
    expect(sync).not.toHaveBeenCalled();
  });

  it('is NON-FATAL: a sync failure does not throw and is logged for reconciliation', async () => {
    sync.mockRejectedValueOnce(new Error('posting down'));
    await expect(
      maybeSyncSalePackageSold(actor, SALES_TABLE_ID, finalizedRow()),
    ).resolves.toBeUndefined();
    expect(loggerError).toHaveBeenCalled();
  });
});
