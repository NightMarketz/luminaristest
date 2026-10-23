/**
 * BE-INCR-SCOPE-UNIT-GUARD (nó I6, BRIEF item 1): o handler de erro devolve status e código de cada erro do guard.
 */
import type { Response } from 'express';
import { handleApiError } from '../apiUtils';
import { UnitDeletedError, UnitNotFoundError } from '../errors';

jest.mock('../logger', () => ({ __esModule: true, logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), event: jest.fn() }, default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), event: jest.fn() } }));

function mockRes(): Response {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  return res;
}

it('UnitNotFoundError → 404 UNIT_NOT_FOUND', () => {
  const res = mockRes();
  handleApiError(new UnitNotFoundError(), res);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith({ code: 'UNIT_NOT_FOUND', message: 'Unidade não encontrada.' });
});

it('UnitDeletedError → 409 UNIT_DELETED', () => {
  const res = mockRes();
  handleApiError(new UnitDeletedError(), res);
  expect(res.status).toHaveBeenCalledWith(409);
  expect(res.json).toHaveBeenCalledWith({ code: 'UNIT_DELETED', message: 'Unidade apagada — restaure-a para lançar.' });
});
