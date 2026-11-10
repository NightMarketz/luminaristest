import type { Request, Response } from 'express';

/**
 * BRD F-04.2 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-04 do inventário de estruturas implícitas).
 *
 * Paginação lida por `Number()`: `listDocuments` deixava `NaN` seguir até o serviço e `getTableData`
 * trocava valor inválido por 1 e 50 em silêncio — o cliente recebia outra página sem aviso.
 * Comportamento esperado: `page`/`limit`/`pageSize` que não são inteiro positivo respondem 400 e o
 * serviço não é chamado. Valor válido acima do teto continua limitado ao teto (política, não erro).
 */
const getAllDocuments = jest.fn();
const getTableData = jest.fn();

jest.mock('@/lib/authUtils', () => ({
  __esModule: true,
  getUserContextFromRequest: () => ({ id: 'u1', userId: 'u1' }),
}));
jest.mock('@/lib/factory', () => ({
  __esModule: true,
  getFactory: () => ({
    getDocumentService: () => ({ getAllDocuments }),
    getDynamicTableService: () => ({ getTableData }),
  }),
}));

import { listDocuments } from '../documentsController';
import { getTableData as getTableDataHandler } from '../dynamicTablesController';

const TABLE_ID = 'ckotable00000000000001';

function mockRes(): Response {
  const res = {} as Response;
  res.status = jest.fn(() => res) as unknown as Response['status'];
  res.json = jest.fn(() => res) as unknown as Response['json'];
  res.setHeader = jest.fn(() => res) as unknown as Response['setHeader'];
  return res;
}

const INVALID: Array<Record<string, string>> = [
  { page: 'abc' },
  { page: '0' },
  { page: '1.5' },
  { limit: 'xyz' },
  { limit: '0' },
];

describe('BRD F-04.2 — paginação inválida responde 400', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAllDocuments.mockResolvedValue([]);
    getTableData.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50, totalPages: 0 });
  });

  it.each(INVALID)('BRD F-04.2 listDocuments %j → 400, serviço não chamado', async (query) => {
    const res = mockRes();
    await listDocuments({ query } as unknown as Request, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(getAllDocuments).not.toHaveBeenCalled();
  });

  it.each([...INVALID, { pageSize: '-3' }])('BRD F-04.2 getTableData %j → 400, serviço não chamado', async (query) => {
    const res = mockRes();
    await getTableDataHandler({ params: { tableId: TABLE_ID }, query } as unknown as Request, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(getTableData).not.toHaveBeenCalled();
  });

  it('BRD F-04.2 controle: valor válido acima do teto é limitado, sem erro', async () => {
    const res = mockRes();
    await listDocuments({ query: { page: '2', limit: '500' } } as unknown as Request, res);
    expect(getAllDocuments).toHaveBeenCalledWith(expect.anything(), 2, 100);

    const res2 = mockRes();
    await getTableDataHandler(
      { params: { tableId: TABLE_ID }, query: { page: '3', pageSize: '5000' } } as unknown as Request,
      res2,
    );
    expect(getTableData).toHaveBeenCalledWith(expect.anything(), TABLE_ID, 3, 1000);
  });
});
