import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import { MitExportListQuerySchema, MitExportRequestSchema } from '../features/accounting/dtos/MitExportDto';

/**
 * BE-INCR-MIT-EXPORT PR-2 (nó X9, item 12) — borda HTTP fina: auth → Zod safeParse → escopo → service →
 * handleApiError. `unitId` só resolve escopo/policy/auditoria (lacuna 1 do PR-2, dono 07/10).
 */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

/** POST /api/accounting/mit-exports — gera o arquivo do PA e registra a geração. */
export const createMitExport = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = MitExportRequestSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory().getMitExportService().gerar(resolveAccountingScope(user, b.data.unitId), b.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/mit-exports?unitId=&anoCalendario= — com `defasado`. */
export const listMitExports = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = MitExportListQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getMitExportService().list(resolveAccountingScope(user, q.data.unitId), q.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
