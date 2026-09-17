import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  ServiceFiscalProfileParamsSchema,
  ServiceFiscalProfileScopeQuerySchema,
  UpsertServiceFiscalProfileSchema,
} from '../features/accounting/dtos/ServiceFiscalProfileDto';

/** BE-INCR-DFE (nó X10b, BRIEF item 8) — GET/PUT/DELETE /api/accounting/service-fiscal-profiles[/:serviceRef]. */
export const listServiceFiscalProfiles = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ServiceFiscalProfileScopeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getServiceFiscalProfileService().list(scope);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getServiceFiscalProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = ServiceFiscalProfileParamsSchema.safeParse(req.params);
    const query = ServiceFiscalProfileScopeQuerySchema.safeParse(req.query);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const scope = resolveAccountingScope(user, query.data.unitId);
    const data = await getFactory().getServiceFiscalProfileService().get(scope, params.data.serviceRef);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const upsertServiceFiscalProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = ServiceFiscalProfileParamsSchema.safeParse(req.params);
    const body = UpsertServiceFiscalProfileSchema.safeParse(req.body);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const scope = resolveAccountingScope(user, body.data.unitId);
    const data = await getFactory().getServiceFiscalProfileService().upsert(scope, params.data.serviceRef, body.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const deleteServiceFiscalProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = ServiceFiscalProfileParamsSchema.safeParse(req.params);
    const query = ServiceFiscalProfileScopeQuerySchema.safeParse(req.query);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const scope = resolveAccountingScope(user, query.data.unitId);
    await getFactory().getServiceFiscalProfileService().delete(scope, params.data.serviceRef);
    return res.json({ success: true });
  } catch (error) {
    return handleApiError(error, res);
  }
};
