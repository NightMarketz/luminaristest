import type { Request, Response } from 'express';

// --- Mock dos colaboradores (auth, tratamento de erro) — mesmo padrão de crmController.test.ts ---
const getUserContextFromRequest = jest.fn();
const handleApiError = jest.fn();

jest.mock('../../../../lib/authUtils', () => ({
  __esModule: true,
  getUserContextFromRequest: (req: unknown) => getUserContextFromRequest(req),
}));
jest.mock('../../../../lib/apiUtils', () => ({
  __esModule: true,
  handleApiError: (...args: unknown[]) => handleApiError(...args),
}));

import { createAccountingBindingController } from '../accountingBindingController';

function mockRes(): Response {
  const res = {} as Response;
  res.status = jest.fn(() => res) as unknown as Response['status'];
  res.json = jest.fn(() => res) as unknown as Response['json'];
  return res;
}

const validEventBinding = {
  eventKey: 'salon.sale.finalized',
  archetypeKey: 'revenue_recognition',
  fieldSlots: [{ slotName: 'amount', sourceField: 'event.amount', transform: 'cents_from_reais' }],
  roleSlots: [{ role: 'controle-recebível', accountCode: '1.1.2' }],
};

const validBody = {
  unitId: 'unit-1',
  sectorKey: 'beautySalon',
  operationalSchema: { 'salon.sale.finalized': ['amount'] },
  chart: [{ code: '1.1.2', nature: 'Asset', acceptsEntries: true }],
  eventBindings: [validEventBinding],
};

describe('accountingBindingController — handlers criados por createAccountingBindingController', () => {
  const compile = jest.fn();
  const validateOnly = jest.fn();
  const list = jest.fn();
  const controller = createAccountingBindingController({
    // buildCompileService(scope) — fábrica por escopo (item 15 do BRIEF, achado da fiação real:
    // ChartLookupPort não recebe scope, então o service real não pode ser uma instância fixa; ver
    // comentário em `accountingBindingController.ts`). O dublê devolve o MESMO trio de mocks
    // pra toda chamada — suficiente pra este teste, que só prova delegação de handler.
    buildCompileService: () => ({ compile, validateOnly, list } as never),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getUserContextFromRequest.mockReturnValue({ userId: 'u1' });
  });

  describe('compileBinding', () => {
    it('401 sem usuário autenticado — e NÃO chama o service', async () => {
      getUserContextFromRequest.mockReturnValueOnce(null);
      const req = { body: validBody } as unknown as Request;
      const res = mockRes();

      await controller.compileBinding(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(compile).not.toHaveBeenCalled();
    });

    it('400 com corpo malformado — e NÃO chama o service', async () => {
      const req = { body: { ...validBody, eventBindings: [] } } as unknown as Request;
      const res = mockRes();

      await controller.compileBinding(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(compile).not.toHaveBeenCalled();
    });

    it('corpo válido: resolve o escopo do unitId do BODY e delega ao service', async () => {
      compile.mockResolvedValueOnce({ status: 'Active' });
      const req = { body: validBody } as unknown as Request;
      const res = mockRes();

      await controller.compileBinding(req, res);

      expect(compile).toHaveBeenCalledTimes(1);
      const [scope, input] = compile.mock.calls[0];
      expect(scope).toMatchObject({ ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1' });
      expect(input.sectorKey).toBe('beautySalon');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { status: 'Active' } });
    });

    it('erro do service vai para handleApiError, não estoura sem tratamento', async () => {
      const boom = new Error('boom');
      compile.mockRejectedValueOnce(boom);
      const req = { body: validBody } as unknown as Request;
      const res = mockRes();

      await controller.compileBinding(req, res);

      expect(handleApiError).toHaveBeenCalledWith(boom, res);
    });
  });

  describe('validateBinding', () => {
    it('corpo válido: delega a validateOnly (NÃO a compile) — não persiste', async () => {
      validateOnly.mockResolvedValueOnce({ validation: { ok: true, blocking: [], warnings: [] } });
      const req = { body: validBody } as unknown as Request;
      const res = mockRes();

      await controller.validateBinding(req, res);

      expect(validateOnly).toHaveBeenCalledTimes(1);
      expect(compile).not.toHaveBeenCalled();
    });

    it('400 com corpo malformado', async () => {
      const req = { body: { ...validBody, chart: [] } } as unknown as Request;
      const res = mockRes();

      await controller.validateBinding(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(validateOnly).not.toHaveBeenCalled();
    });
  });

  describe('listBindings', () => {
    it('query válida: delega ao service com sectorKey/status opcionais', async () => {
      list.mockResolvedValueOnce([{ id: 'b1' }]);
      const req = { query: { unitId: 'unit-1', sectorKey: 'beautySalon' } } as unknown as Request;
      const res = mockRes();

      await controller.listBindings(req, res);

      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({ unitId: 'unit-1' }),
        { sectorKey: 'beautySalon', status: undefined },
      );
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 'b1' }] });
    });

    it('400 sem unitId na query', async () => {
      const req = { query: {} } as unknown as Request;
      const res = mockRes();

      await controller.listBindings(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(list).not.toHaveBeenCalled();
    });
  });
});
