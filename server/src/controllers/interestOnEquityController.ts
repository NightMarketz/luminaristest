import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import {
  JcpConfirmInputSchema,
  JcpIdParamSchema,
  JcpIrrfQuerySchema,
  JcpPreviewInputSchema,
  JcpScopeSchema,
} from '../features/accounting/dtos/InterestOnEquityDto';

/** BE-INCR-IRRF-DISTRIBUICAO PR-3/PR-4 (BRIEF itens 22–31) — juros sobre o capital próprio. */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });
const scopeOf = async (req: Request, unitId: string, access: 'read' | 'write') => {
  const user = getUserContextFromRequest(req);
  return user ? getFactory().getAccountingScopeResolver().resolve(user, unitId, { access }) : null;
};
const unauthorized = (res: Response) => res.status(401).json({ success: false, error: 'Unauthorized' });

export const previewJcp = async (req: Request, res: Response) => {
  try {
    const b = JcpPreviewInputSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const scope = await scopeOf(req, b.data.unitId, 'read');
    if (!scope) return unauthorized(res);
    return res.json({ success: true, data: await getFactory().getInterestOnEquityService().preview(scope, b.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const confirmJcp = async (req: Request, res: Response) => {
  try {
    const b = JcpConfirmInputSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const scope = await scopeOf(req, b.data.unitId, 'write');
    if (!scope) return unauthorized(res);
    return res.status(201).json({ success: true, data: await getFactory().getInterestOnEquityService().confirm(scope, b.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getJcpIrrf = async (req: Request, res: Response) => {
  try {
    const q = JcpIrrfQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const scope = await scopeOf(req, q.data.unitId, 'read');
    if (!scope) return unauthorized(res);
    return res.json({ success: true, data: await getFactory().getInterestOnEquityService().irrfMensal(scope, q.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getJcp = async (req: Request, res: Response) => {
  try {
    const p = JcpIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = JcpScopeSchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const scope = await scopeOf(req, q.data.unitId, 'read');
    if (!scope) return unauthorized(res);
    return res.json({ success: true, data: await getFactory().getInterestOnEquityService().get(scope, p.data.id) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const reconcileJcp = async (req: Request, res: Response) => {
  try {
    const p = JcpIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = JcpScopeSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const scope = await scopeOf(req, b.data.unitId, 'write');
    if (!scope) return unauthorized(res);
    return res.json({ success: true, data: await getFactory().getInterestOnEquityService().reconcileLancamento(scope, p.data.id) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const cancelJcp = async (req: Request, res: Response) => {
  try {
    const p = JcpIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = JcpScopeSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const scope = await scopeOf(req, b.data.unitId, 'write');
    if (!scope) return unauthorized(res);
    return res.json({ success: true, data: await getFactory().getInterestOnEquityService().cancel(scope, p.data.id) });
  } catch (error) {
    return handleApiError(error, res);
  }
};
