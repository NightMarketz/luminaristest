import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import type { AccountingScope } from '../features/accounting/scope/AccountingScope';
import { FatorRSimulacaoQuerySchema, RegimeSimulacaoQuerySchema, RemuneracaoSocioQuerySchema } from '../features/accounting/dtos/TaxSimulationDto';

/**
 * EFICIENCIA-FISCAL PR-3 itens 15–18 (BRIEF §4.3; decisão 5 de D-2026-10-28-EFICIENCIA-FISCAL-PR3-EXECUCAO) —
 * GET /api/accounting/simples/simulacoes/fator-r, GET /api/accounting/simulacoes/regime e
 * GET /api/accounting/simulacoes/remuneracao-socio (calculam e não gravam); POST no mesmo caminho + /sugestao, com os mesmos
 * campos no corpo, grava a sugestão do SYSTEM.
 */
function handler<Q extends { unitId: string }, R>(
  schema: ZodType<Q>,
  from: 'query' | 'body',
  access: 'read' | 'write',
  run: (scope: AccountingScope, q: Q) => Promise<R>,
  status = 200,
) {
  return async (req: Request, res: Response) => {
    try {
      const user = getUserContextFromRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const parsed = schema.safeParse(from === 'query' ? req.query : req.body);
      if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
      const scope = await getFactory().getAccountingScopeResolver().resolve(user, parsed.data.unitId, { access });
      return res.status(status).json({ success: true, data: await run(scope, parsed.data) });
    } catch (error) {
      return handleApiError(error, res);
    }
  };
}

const svc = () => getFactory().getTaxSimulationService();

export const simularFatorR = handler(FatorRSimulacaoQuerySchema, 'query', 'read', (s, q) => svc().fatorR(s, q));
export const proporFatorR = handler(FatorRSimulacaoQuerySchema, 'body', 'write', (s, q) => svc().proporFatorR(s, q), 201);
export const simularRegime = handler(RegimeSimulacaoQuerySchema, 'query', 'read', (s, q) => svc().regime(s, q));
export const proporRegime = handler(RegimeSimulacaoQuerySchema, 'body', 'write', (s, q) => svc().proporRegime(s, q), 201);
export const simularRemuneracaoSocio = handler(RemuneracaoSocioQuerySchema, 'query', 'read', (s, q) => svc().remuneracaoSocio(s, q));
export const proporRemuneracaoSocio = handler(RemuneracaoSocioQuerySchema, 'body', 'write', (s, q) => svc().proporRemuneracao(s, q), 201);
