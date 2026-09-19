import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import { ValidationError } from '../lib/errors';
import {
  CreateFixedAssetClassSchema,
  DeleteFixedAssetClassSchema,
  FixedAssetClassScopeQuerySchema,
  UpdateFixedAssetClassSchema,
} from '../features/accounting/dtos/FixedAssetClassDto';

/** BE-INCR-FIXED-ASSETS (nó C8, item 1/7) — GET/POST /fixed-asset-classes, PATCH/DELETE /:id. */
export const listFixedAssetClasses = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = FixedAssetClassScopeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getFixedAssetClassService().listClasses(scope);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const createFixedAssetClass = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = CreateFixedAssetClassSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getFixedAssetClassService().createClass(scope, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const updateFixedAssetClass = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = UpdateFixedAssetClassSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    if (parsed.data.classId !== req.params.id) {
      return res.status(400).json({ success: false, error: `classId do corpo (${parsed.data.classId}) diverge do :id (${req.params.id}).` });
    }
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getFixedAssetClassService().updateClass(scope, req.params.id, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const deleteFixedAssetClass = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = DeleteFixedAssetClassSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    if (parsed.data.classId !== req.params.id) {
      throw new ValidationError(`classId do corpo (${parsed.data.classId}) diverge do :id (${req.params.id}).`);
    }
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getFixedAssetClassService().deleteClass(scope, req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
