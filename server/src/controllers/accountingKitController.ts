import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveBindingScope } from '../features/accountingBinding/models/bindingScope';
import { KitTraceQuerySchema } from '../features/sectorKits/dtos/KitTraceDto';

/**
 * Kit de setor — borda HTTP fina (auth → Zod safeParse → escopo → service → handleApiError).
 * PR-6 do KIT-SETOR (item 50): o rastro evento → fato → lançamento. Só leitura.
 */

/** GET /api/accounting-kit/trace?unitId=&sourceType=&sourceId= */
export const getKitTrace = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = KitTraceQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveBindingScope(user, parsed.data.unitId);
    const data = await getFactory().getKitTraceService(scope).trace(scope, parsed.data.sourceType, parsed.data.sourceId);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
