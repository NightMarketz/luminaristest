import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import {
  CreateWithholdingProfileSchema,
  ListWithholdingProfilesQuerySchema,
  UpdateWithholdingProfileSchema,
  WithholdingProfileIdParamSchema,
  WithholdingProfileScopeSchema,
} from '../features/accounting/dtos/WithholdingProfileDto';

/** BE-INCR-RETENCOES-FONTE PR-1 (BRIEF item 6) — perfil de retenção por contraparte × natureza do serviço. */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

export const listWithholdingProfiles = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = ListWithholdingProfilesQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' });
    const data = await getFactory().getWithholdingProfileService().list(scope, q.data.counterpartyId);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getWithholdingProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = WithholdingProfileIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = WithholdingProfileScopeSchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' });
    const data = await getFactory().getWithholdingProfileService().get(scope, p.data.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const createWithholdingProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = CreateWithholdingProfileSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' });
    const data = await getFactory().getWithholdingProfileService().create(scope, b.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const updateWithholdingProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = WithholdingProfileIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = UpdateWithholdingProfileSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' });
    const data = await getFactory().getWithholdingProfileService().update(scope, p.data.id, b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const deleteWithholdingProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = WithholdingProfileIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = WithholdingProfileScopeSchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'write' });
    await getFactory().getWithholdingProfileService().remove(scope, p.data.id);
    return res.json({ success: true });
  } catch (error) {
    return handleApiError(error, res);
  }
};
