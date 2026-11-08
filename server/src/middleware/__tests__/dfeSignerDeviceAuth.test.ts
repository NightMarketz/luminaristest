/**
 * X10a EMENDA-4 AL-5 — o middleware de Bearer do dispositivo, isolado: os três casos (sem header, header mal-formado,
 * token desconhecido) e o caminho feliz. A integração pela pilha HTTP mora em `dfeSigner.integration.test.ts`.
 */
import type { NextFunction, Request, Response } from 'express';

const autenticarDispositivo = jest.fn();
jest.mock('../../lib/factory', () => ({ getFactory: () => ({ getDfeSignerService: () => ({ autenticarDispositivo }) }) }));

import { optionalDfeSignerDevice, requireDfeSignerDevice, type RequestComDispositivo } from '../dfeSignerDeviceAuth';

function run(mw: typeof requireDfeSignerDevice, authorization?: string) {
  const req = { headers: authorization === undefined ? {} : { authorization }, method: 'GET', baseUrl: '/api/dfe-assinador', path: '/v1/x' } as unknown as Request;
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req: req as RequestComDispositivo, res, next, done: mw(req, res, next) };
}

describe('dfeSignerDeviceAuth (AL-5)', () => {
  beforeEach(() => autenticarDispositivo.mockReset());

  it('obrigatório: sem header, header mal-formado e token desconhecido ⇒ 401, sem dizer qual', async () => {
    autenticarDispositivo.mockResolvedValue(null);
    for (const h of [undefined, 'Basic abc', 'Bearer curto', `Bearer ${'x'.repeat(43)}`]) {
      const { res, next, done } = run(requireDfeSignerDevice, h);
      await done;
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    }
    // só o token bem-formado chega ao serviço (o mal-formado nem consulta o banco)
    expect(autenticarDispositivo).toHaveBeenCalledTimes(1);
  });

  it('token válido ⇒ o dispositivo vai para a requisição e segue', async () => {
    autenticarDispositivo.mockResolvedValue({ id: 'd-1', units: [] });
    const { req, next, done } = run(requireDfeSignerDevice, `Bearer ${'y'.repeat(43)}`);
    await done;
    expect(next).toHaveBeenCalledWith();
    expect(req.dfeSignerDevice).toEqual({ id: 'd-1', units: [] });
  });

  it('opcional: sem header segue sem dispositivo; com header inválido ⇒ 401 (L-AL-2 não aceita Bearer ruim)', async () => {
    const sem = run(optionalDfeSignerDevice);
    await sem.done;
    expect(sem.next).toHaveBeenCalledWith();
    expect(sem.req.dfeSignerDevice).toBeUndefined();
    autenticarDispositivo.mockResolvedValue(null);
    const ruim = run(optionalDfeSignerDevice, `Bearer ${'z'.repeat(43)}`);
    await ruim.done;
    expect(ruim.res.status).toHaveBeenCalledWith(401);
  });
});
