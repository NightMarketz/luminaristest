import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import { ValidationError } from '../lib/errors';
import {
  ActivateFixedAssetSchema,
  CreateFixedAssetSchema,
  DeleteFixedAssetSchema,
  DisposeFixedAssetSchema,
  FixedAssetScopeQuerySchema,
  ListFixedAssetsQuerySchema,
  UpdateFixedAssetSchema,
} from '../features/accounting/dtos/FixedAssetDto';

/** BE-INCR-FIXED-ASSETS (nó C8, Blocos B+D) — /fixed-assets CRUD + comandos activate/dispose. */
export const listFixedAssets = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ListFixedAssetsQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getFixedAssetService().listAssets(scope, { status: parsed.data.status, classId: parsed.data.classId });
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getFixedAsset = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = FixedAssetScopeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getFixedAssetService().getAsset(scope, req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const createFixedAsset = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = CreateFixedAssetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getFixedAssetService().createAsset(scope, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const updateFixedAsset = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = UpdateFixedAssetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    if (parsed.data.assetId !== req.params.id) {
      return res.status(400).json({ success: false, error: `assetId do corpo (${parsed.data.assetId}) diverge do :id (${req.params.id}).` });
    }
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getFixedAssetService().updateAsset(scope, req.params.id, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const deleteFixedAsset = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = DeleteFixedAssetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    if (parsed.data.assetId !== req.params.id) {
      throw new ValidationError(`assetId do corpo (${parsed.data.assetId}) diverge do :id (${req.params.id}).`);
    }
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getFixedAssetService().deleteAsset(scope, req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const activateFixedAsset = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ActivateFixedAssetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    if (parsed.data.assetId !== req.params.id) {
      return res.status(400).json({ success: false, error: `assetId do corpo (${parsed.data.assetId}) diverge do :id (${req.params.id}).` });
    }
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getFixedAssetService().activateAsset(scope, req.params.id, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const disposeFixedAsset = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = DisposeFixedAssetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    if (parsed.data.assetId !== req.params.id) {
      return res.status(400).json({ success: false, error: `assetId do corpo (${parsed.data.assetId}) diverge do :id (${req.params.id}).` });
    }
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getFixedAssetService().disposeAsset(scope, req.params.id, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
