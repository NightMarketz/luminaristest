import type { Request, Response } from 'express';

/**
 * BE-INCR-DT-VERSION-LEDGER item 14 + L5 (dono, 2026-10-17): o restore chama, DEPOIS do commit, as mesmas pontes
 * contábeis do PUT de linha (venda finalizada e pacote vendido), com o tableId da rota e a linha restaurada.
 * Restore que falha não chama ponte nenhuma.
 */
const restoreRowVersion = jest.fn();
const afterDataWrite = jest.fn();
const maybeSyncSaleFinalized = jest.fn();
const maybeSyncSalePackageSold = jest.fn();
const handleApiError = jest.fn();

jest.mock('@/lib/authUtils', () => ({
  __esModule: true,
  getUserContextFromRequest: () => ({ id: 'u1', userId: 'u1' }),
}));
jest.mock('@/lib/apiUtils', () => ({
  __esModule: true,
  handleApiError: (...args: unknown[]) => handleApiError(...args),
}));
jest.mock('@/lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({
    getDynamicTableVersionService: () => ({ restoreRowVersion }),
    getDynamicTableWriteEffects: () => ({ afterDataWrite }),
  }),
}));
jest.mock('@/features/accounting/sync/bridges/SaleSalesAccountingBridge', () => ({
  __esModule: true,
  maybeSyncSaleFinalized: (...a: unknown[]) => maybeSyncSaleFinalized(...a),
}));
jest.mock('@/features/accounting/sync/bridges/SalePackageSoldBridge', () => ({
  __esModule: true,
  maybeSyncSalePackageSold: (...a: unknown[]) => maybeSyncSalePackageSold(...a),
}));

import { restoreRowVersion as restoreHandler } from '../dynamicTableVersionsController';

const TABLE_ID = 'ckotable00000000000001';
const DATA_ID = 'ckodata000000000000001';

function mockRes(): Response {
  const res = {} as Response;
  res.status = jest.fn(() => res) as unknown as Response['status'];
  res.json = jest.fn(() => res) as unknown as Response['json'];
  return res;
}

describe('dynamicTableVersionsController.restoreRowVersion — pontes contábeis (L5)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('chama as duas pontes depois do restore, com (ctx, tableId, linha restaurada)', async () => {
    const restored = { id: DATA_ID, data: { status: 'Finalized' } };
    restoreRowVersion.mockResolvedValueOnce(restored);
    const req = { params: { tableId: TABLE_ID, dataId: DATA_ID, version: '2' } } as unknown as Request;
    const res = mockRes();

    await restoreHandler(req, res);

    expect(restoreRowVersion).toHaveBeenCalledWith({ id: 'u1', userId: 'u1' }, TABLE_ID, DATA_ID, 2);
    expect(maybeSyncSaleFinalized).toHaveBeenCalledWith({ id: 'u1', userId: 'u1' }, TABLE_ID, restored);
    expect(maybeSyncSalePackageSold).toHaveBeenCalledWith({ id: 'u1', userId: 'u1' }, TABLE_ID, restored);
    expect(restoreRowVersion.mock.invocationCallOrder[0]).toBeLessThan(maybeSyncSaleFinalized.mock.invocationCallOrder[0]);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: restored });
    // BE-INCR-DT-NO-CONSUMER-CALLS: restore é escrita de linha — invalida o KPI do dono depois do commit.
    expect(afterDataWrite).toHaveBeenCalledWith('u1');
  });

  it('restore que falha não chama ponte', async () => {
    restoreRowVersion.mockRejectedValueOnce(new Error('400'));
    const req = { params: { tableId: TABLE_ID, dataId: DATA_ID, version: '1' } } as unknown as Request;
    await restoreHandler(req, mockRes());
    expect(maybeSyncSaleFinalized).not.toHaveBeenCalled();
    expect(afterDataWrite).not.toHaveBeenCalled();
    expect(maybeSyncSalePackageSold).not.toHaveBeenCalled();
    expect(handleApiError).toHaveBeenCalledTimes(1);
  });

  it('versão inválida na rota → 400 sem chamar o serviço', async () => {
    const req = { params: { tableId: TABLE_ID, dataId: DATA_ID, version: '0' } } as unknown as Request;
    const res = mockRes();
    await restoreHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(restoreRowVersion).not.toHaveBeenCalled();
  });
});
