import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { ReinfBatchGetQuerySchema, ReinfBatchListQuerySchema, ReinfBatchRequestSchema } from '../features/accounting/dtos/ReinfDto';

/**
 * BE-INCR-EFD-REINF PR-1 (nó EFD-REINF, item 11) — borda HTTP fina: auth → Zod safeParse → escopo → service →
 * handleApiError. `unitId` só resolve escopo/policy/auditoria (precedente do X9); o lote é da PJ inteira.
 */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

/** POST /api/accounting/reinf/batches — gera o lote da competência e registra a geração. */
export const createReinfBatch = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = ReinfBatchRequestSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory().getReinfService().gerar(await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' }), b.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/reinf/batches?unitId=&competencia= — com `defasado`. */
export const listReinfBatches = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = ReinfBatchListQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getReinfService().list(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' }), q.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/reinf/batches/:id?unitId= — o registro, sem o XML. */
export const getReinfBatch = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = ReinfBatchGetQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getReinfService().get(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' }), String(req.params.id));
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
