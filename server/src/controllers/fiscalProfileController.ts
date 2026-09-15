import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import { FiscalProfileScopeQuerySchema, UpsertFiscalProfileSchema } from '../features/accounting/dtos/FiscalProfileDto';

/** BE-INCR-NFE-COST-REGIME (nó X6, item 4) — GET/PUT /api/accounting/fiscal-profile. */
export const getFiscalProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = FiscalProfileScopeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getFiscalProfileService().get(scope);
    if (!data) {
      return res.status(404).json({ success: false, error: 'fiscal_profile_missing', message: 'Perfil fiscal da unidade não cadastrado.' });
    }
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const upsertFiscalProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = UpsertFiscalProfileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getFiscalProfileService().upsert(scope, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
