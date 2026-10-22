import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import {
  CreatePartnerSchema,
  ListPartnersQuerySchema,
  PartnerIdParamSchema,
  PartnerScopeSchema,
  UpdatePartnerSchema,
} from '../features/accounting/dtos/PartnerDto';

/** BE-INCR-IRRF-DISTRIBUICAO PR-1 (BRIEF itens 1–4) — sócios da empresa (beneficiários da distribuição e do JCP). */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

export const listPartners = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = ListPartnersQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getPartnerService().list(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' }), q.data.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getPartner = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = PartnerIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = PartnerScopeSchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getPartnerService().get(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' }), p.data.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const createPartner = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = CreatePartnerSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory().getPartnerService().create(await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' }), b.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const updatePartner = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = PartnerIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = UpdatePartnerSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory().getPartnerService().update(await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' }), p.data.id, b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const deletePartner = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = PartnerIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = PartnerScopeSchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    await getFactory().getPartnerService().remove(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'write' }), p.data.id);
    return res.json({ success: true });
  } catch (error) {
    return handleApiError(error, res);
  }
};
