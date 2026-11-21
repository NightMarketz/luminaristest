import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { CreateInsumoStockCountSchema } from '../features/accounting/dtos/InsumoStockCountDto';

/** BE-INCR-INSUMO-INVENTARIO-PERIODICO (BRIEF item 4) — POST /api/accounting/insumo-stock-counts. */
export const createInsumoStockCount = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const body = CreateInsumoStockCountSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, body.data.unitId, { access: 'write' });
    const data = await getFactory().getInsumoStockCountService().count(scope, body.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
