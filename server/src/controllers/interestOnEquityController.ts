import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { JcpPreviewInputSchema } from '../features/accounting/dtos/InterestOnEquityDto';

/** BE-INCR-IRRF-DISTRIBUICAO PR-3 (BRIEF itens 22–26) — juros sobre o capital próprio: cálculo e prévia. */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

export const previewJcp = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = JcpPreviewInputSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'read' });
    return res.json({ success: true, data: await getFactory().getInterestOnEquityService().preview(scope, b.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};
