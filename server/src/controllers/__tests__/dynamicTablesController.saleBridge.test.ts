import type { Request, Response } from 'express';

/**
 * dynamicTablesController → SaleSalesAccountingBridge wiring (Incremento C).
 * Proves the bridge is invoked POST-COMMIT on BOTH the create and update seams
 * (a sale may be born Finalized), with the route tableId and the persisted row,
 * and that it runs AFTER the DynamicTable write returns.
 */
const createTableData = jest.fn();
const updateTableData = jest.fn();
const maybeSyncSaleFinalized = jest.fn();
const getUserContextFromRequest = jest.fn(() => ({ id: 'u1', userId: 'u1' }));
const handleApiError = jest.fn();

jest.mock('@/lib/authUtils', () => ({
  __esModule: true,
  getUserContextFromRequest: () => getUserContextFromRequest(),
}));
jest.mock('@/lib/apiUtils', () => ({
  __esModule: true,
  handleApiError: (...args: unknown[]) => handleApiError(...args),
}));
jest.mock('@/lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({
    getDynamicTableService: () => ({ createTableData, updateTableData }),
  }),
}));
jest.mock('@/features/accounting/sync/bridges/SaleSalesAccountingBridge', () => ({
  __esModule: true,
  maybeSyncSaleFinalized: (...a: unknown[]) => maybeSyncSaleFinalized(...a),
}));

import {
  createTableData as createHandler,
  updateTableData as updateHandler,
} from '../dynamicTablesController';

const TABLE_ID = 'ckotable00000000000001';
const DATA_ID = 'ckodata000000000000001';

function mockRes(): Response {
  const res = {} as Response;
  res.status = jest.fn(() => res) as unknown as Response['status'];
  res.json = jest.fn(() => res) as unknown as Response['json'];
  return res;
}

describe('dynamicTablesController sale-bridge wiring', () => {
  beforeEach(() => jest.clearAllMocks());

  it('createTableData calls the bridge post-commit with (ctx, tableId, created)', async () => {
    const created = { id: 'sale-1', data: { status: 'Finalized', unitId: 'unit-1', totalAmount: 250 } };
    createTableData.mockResolvedValueOnce(created);
    const req = { params: { tableId: TABLE_ID }, body: { data: { status: 'Finalized' } } } as unknown as Request;
    const res = mockRes();

    await createHandler(req, res);

    expect(maybeSyncSaleFinalized).toHaveBeenCalledTimes(1);
    expect(maybeSyncSaleFinalized).toHaveBeenCalledWith({ id: 'u1', userId: 'u1' }, TABLE_ID, created);
    // ordering: write committed BEFORE the bridge runs
    expect(createTableData.mock.invocationCallOrder[0]).toBeLessThan(
      maybeSyncSaleFinalized.mock.invocationCallOrder[0],
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('updateTableData calls the bridge post-commit with (ctx, tableId, updated)', async () => {
    const updated = { id: 'sale-1', data: { status: 'Finalized', unitId: 'unit-1', totalAmount: 250 } };
    updateTableData.mockResolvedValueOnce(updated);
    const req = {
      params: { tableId: TABLE_ID, dataId: DATA_ID },
      body: { data: { status: 'Finalized' } },
    } as unknown as Request;
    const res = mockRes();

    await updateHandler(req, res);

    expect(maybeSyncSaleFinalized).toHaveBeenCalledTimes(1);
    expect(maybeSyncSaleFinalized).toHaveBeenCalledWith({ id: 'u1', userId: 'u1' }, TABLE_ID, updated);
    expect(updateTableData.mock.invocationCallOrder[0]).toBeLessThan(
      maybeSyncSaleFinalized.mock.invocationCallOrder[0],
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
  });
});
