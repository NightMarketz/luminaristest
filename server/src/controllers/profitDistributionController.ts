import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import {
  CancelProfitDistributionSchema,
  IrrfMensalQuerySchema,
  ProfitDistributionIdParamSchema,
  ProfitDistributionInputSchema,
  ProfitDistributionScopeSchema,
} from '../features/accounting/dtos/ProfitDistributionDto';

/** BE-INCR-IRRF-DISTRIBUICAO PR-2 (BRIEF itens 10–21) — distribuição de lucros com IRRF (Lei 9.250 art. 6º-A). */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });
const scopeOf = async (req: Request, unitId: string, access: 'read' | 'write') => {
  const user = getUserContextFromRequest(req);
  return user ? getFactory().getAccountingScopeResolver().resolve(user, unitId, { access }) : null;
};
const unauthorized = (res: Response) => res.status(401).json({ success: false, error: 'Unauthorized' });

export const previewProfitDistribution = async (req: Request, res: Response) => {
  try {
    const b = ProfitDistributionInputSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const scope = await scopeOf(req, b.data.unitId, 'read');
    if (!scope) return unauthorized(res);
    return res.json({ success: true, data: await getFactory().getProfitDistributionService().preview(scope, b.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const createProfitDistribution = async (req: Request, res: Response) => {
  try {
    const b = ProfitDistributionInputSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const scope = await scopeOf(req, b.data.unitId, 'write');
    if (!scope) return unauthorized(res);
    return res.status(201).json({ success: true, data: await getFactory().getProfitDistributionService().create(scope, b.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getProfitDistributionIrrf = async (req: Request, res: Response) => {
  try {
    const q = IrrfMensalQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const scope = await scopeOf(req, q.data.unitId, 'read');
    if (!scope) return unauthorized(res);
    return res.json({ success: true, data: await getFactory().getProfitDistributionService().irrfMensal(scope, q.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getProfitDistribution = async (req: Request, res: Response) => {
  try {
    const p = ProfitDistributionIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = ProfitDistributionScopeSchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const scope = await scopeOf(req, q.data.unitId, 'read');
    if (!scope) return unauthorized(res);
    return res.json({ success: true, data: await getFactory().getProfitDistributionService().get(scope, p.data.id) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const reconcileProfitDistribution = async (req: Request, res: Response) => {
  try {
    const p = ProfitDistributionIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = ProfitDistributionScopeSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const scope = await scopeOf(req, b.data.unitId, 'write');
    if (!scope) return unauthorized(res);
    return res.json({ success: true, data: await getFactory().getProfitDistributionService().reconcileLancamento(scope, p.data.id) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const cancelProfitDistribution = async (req: Request, res: Response) => {
  try {
    const p = ProfitDistributionIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = CancelProfitDistributionSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const scope = await scopeOf(req, b.data.unitId, 'write');
    if (!scope) return unauthorized(res);
    return res.json({ success: true, data: await getFactory().getProfitDistributionService().cancel(scope, p.data.id, b.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};
