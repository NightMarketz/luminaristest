import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { DpScopeQuerySchema } from '../features/dp/dtos/DpModuleDto';

/**
 * BE-INCR-DP-F0-F1 item 54 (PR-5) — `GET /api/dp/rubricas`, o catálogo de rubricas do núcleo (só leitura). Escopo pelo
 * `AccountingScopeResolver` com o `unitId` da query, como `GET /api/dp/modules`.
 */
export const listDpRubricas = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = DpScopeQuerySchema.safeParse(req.query);
    if (!q.success) return res.status(400).json({ success: false, error: q.error.flatten() });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' });
    return res.json({ success: true, data: getFactory().getDpRubricaService().listCatalog(scope) });
  } catch (error) {
    return handleApiError(error, res);
  }
};
