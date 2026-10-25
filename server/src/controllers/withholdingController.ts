import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { ListWithholdingsQuerySchema, WithholdingSummaryQuerySchema } from '../features/accounting/dtos/WithholdingDto';

/** BE-INCR-RETENCOES-FONTE PR-2 (BRIEF item 23, §5.4) — leitura das retenções feitas (contrato da EFD-REINF). */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

/** GET /api/accounting/withholdings?unitId=&direction=MADE&competencia=YYYY-MM — linhas (com taxId do beneficiário). */
export const listWithholdings = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = ListWithholdingsQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' });
    const data = await getFactory().getWithholdingService().linhasFeitas(scope, q.data.competencia);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/withholdings/summary?unitId=&competencia=YYYY-MM — título de imposto por código. */
export const getWithholdingSummary = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = WithholdingSummaryQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' });
    const data = await getFactory().getWithholdingService().resumo(scope, q.data.competencia);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
