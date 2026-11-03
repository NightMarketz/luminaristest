import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import {
  ProductFiscalProfileParamsSchema,
  ProductFiscalProfileScopeQuerySchema,
  UpsertProductFiscalProfileSchema,
} from '../features/accounting/dtos/ProductFiscalProfileDto';

/** BE-INCR-NFCE (nó X10a, item 30) — GET/PUT/DELETE /api/accounting/product-fiscal-profiles[/:productRef]. */
export const listProductFiscalProfiles = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ProductFiscalProfileScopeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, parsed.data.unitId, { access: 'read' });
    const data = await getFactory().getProductFiscalProfileService().list(scope);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getProductFiscalProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = ProductFiscalProfileParamsSchema.safeParse(req.params);
    const query = ProductFiscalProfileScopeQuerySchema.safeParse(req.query);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, query.data.unitId, { access: 'read' });
    const data = await getFactory().getProductFiscalProfileService().get(scope, params.data.productRef);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const upsertProductFiscalProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = ProductFiscalProfileParamsSchema.safeParse(req.params);
    const body = UpsertProductFiscalProfileSchema.safeParse(req.body);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, body.data.unitId, { access: 'write' });
    const data = await getFactory().getProductFiscalProfileService().upsert(scope, params.data.productRef, body.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const deleteProductFiscalProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = ProductFiscalProfileParamsSchema.safeParse(req.params);
    const query = ProductFiscalProfileScopeQuerySchema.safeParse(req.query);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, query.data.unitId, { access: 'write' });
    await getFactory().getProductFiscalProfileService().delete(scope, params.data.productRef);
    return res.json({ success: true });
  } catch (error) {
    return handleApiError(error, res);
  }
};
