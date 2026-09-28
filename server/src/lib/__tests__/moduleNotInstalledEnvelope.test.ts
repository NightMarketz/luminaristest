/**
 * BE-INCR-CRM-MODULE-COMPOSITION (I8) — comportamento 7: o 409 chega ao cliente com o módulo
 * faltante nomeado (`details.moduleKey`), não só o código.
 */
import type { Response } from 'express';
import { handleApiError } from '../apiUtils';
import { ModuleNotInstalledError } from '../errors';

jest.mock('../logger', () => ({ __esModule: true, logger: { error: jest.fn() }, default: { error: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

it('ModuleNotInstalledError → 409 { code: CRM_MODULE_NOT_INSTALLED, details: { moduleKey } }', () => {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  handleApiError(new ModuleNotInstalledError('CRM-2A', 'crmAccounts'), res);
  expect(res.status).toHaveBeenCalledWith(409);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ code: 'CRM_MODULE_NOT_INSTALLED', details: { moduleKey: 'CRM-2A' } }),
  );
});

it('BE-INCR-CRM-SUBMODULES item 8 (F-SUB-7 → a′): missingModules chega ao cliente', () => {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  handleApiError(new ModuleNotInstalledError('CRM-2A', 'crmAccounts', ['CRM-2A', 'CRM-2B']), res);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ code: 'CRM_MODULE_NOT_INSTALLED', details: { moduleKey: 'CRM-2A', missingModules: ['CRM-2A', 'CRM-2B'] } }),
  );
});
