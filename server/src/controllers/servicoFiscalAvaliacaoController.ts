import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { ServicoFiscalAvaliacaoQuerySchema } from '../features/accounting/dtos/ServicoFiscalAvaliacaoDto';

/**
 * EFICIENCIA-FISCAL PR-5 (BRIEF itens 27, 30, 31, 32; lacuna 4 do dono, 28/10) —
 * POST /api/accounting/tax-optimization/servicos/avaliar?unitId=&ano=: alertas e sugestões dos serviços do ano.
 */
export const avaliarServicosFiscais = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const query = ServicoFiscalAvaliacaoQuerySchema.safeParse(req.query);
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, query.data.unitId, { access: 'write' });
    const data = await getFactory().getServicoFiscalAvaliacaoService().avaliar(scope, query.data.ano);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
