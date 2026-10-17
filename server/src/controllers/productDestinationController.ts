import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import {
  ListProductDestinationsQuerySchema,
  ProductDestinationParamsSchema,
  UpsertProductDestinationSchema,
} from '../features/accounting/dtos/ProductDestinationDto';

/** ITEM-DESTINATION PR-2 (BRIEF item 18) — GET/PUT /api/accounting/product-destinations e DELETE /:productRef. */
export const listProductDestinations = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const query = ListProductDestinationsQuerySchema.safeParse(req.query);
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, query.data.unitId, { access: 'read' });
    const data = await getFactory().getProductDestinationService().list(scope);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const upsertProductDestination = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const body = UpsertProductDestinationSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, body.data.unitId, { access: 'write' });
    const data = await getFactory().getProductDestinationService().upsert(scope, body.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const deleteProductDestination = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = ProductDestinationParamsSchema.safeParse(req.params);
    const query = ListProductDestinationsQuerySchema.safeParse(req.query);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, query.data.unitId, { access: 'write' });
    await getFactory().getProductDestinationService().delete(scope, params.data.productRef);
    return res.json({ success: true });
  } catch (error) {
    return handleApiError(error, res);
  }
};
