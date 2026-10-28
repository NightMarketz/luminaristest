import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import {
  DecideSuggestionSchema,
  ServiceCostEvidenceCreateSchema,
  SuggestionListQuerySchema,
  TaxOptimizationIdParamSchema,
  TaxOptimizationScopeQuerySchema,
  UpdateTaxOptimizationPolicySchema,
} from '../features/accounting/dtos/TaxOptimizationDto';

/**
 * EFICIENCIA-FISCAL PR-1 itens 5 e 7 (BRIEF §4.3) — /api/accounting/tax-optimization: GET|PUT /policy,
 * GET|POST /service-costs, DELETE /service-costs/:id, GET /suggestions, POST /suggestions/:id/accept|reject.
 */
const scopeOf = (user: NonNullable<ReturnType<typeof getUserContextFromRequest>>, unitId: string, access: 'read' | 'write') =>
  getFactory().getAccountingScopeResolver().resolve(user, unitId, { access });

export const getTaxOptimizationPolicy = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const query = TaxOptimizationScopeQuerySchema.safeParse(req.query);
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const data = await getFactory().getTaxOptimizationService().getPolicy(await scopeOf(user, query.data.unitId, 'read'));
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const updateTaxOptimizationPolicy = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const body = UpdateTaxOptimizationPolicySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const data = await getFactory().getTaxOptimizationService().updatePolicy(await scopeOf(user, body.data.unitId, 'write'), body.data);
    // CARGA_TRIBUTARIA não aplica: vira sugestão do contador (202 — aceita para decisão).
    return res.status(data.applied ? 200 : 202).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const listServiceCosts = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const query = TaxOptimizationScopeQuerySchema.safeParse(req.query);
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const data = await getFactory().getTaxOptimizationService().listServiceCosts(await scopeOf(user, query.data.unitId, 'read'));
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const createServiceCost = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const body = ServiceCostEvidenceCreateSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const data = await getFactory().getTaxOptimizationService().createServiceCost(await scopeOf(user, body.data.unitId, 'write'), body.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const deleteServiceCost = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = TaxOptimizationIdParamSchema.safeParse(req.params);
    const query = TaxOptimizationScopeQuerySchema.safeParse(req.query);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    await getFactory().getTaxOptimizationService().deleteServiceCost(await scopeOf(user, query.data.unitId, 'write'), params.data.id);
    return res.json({ success: true });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const listTaxSuggestions = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const query = SuggestionListQuerySchema.safeParse(req.query);
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const scope = await getFactory().getAccountingScopeResolver().resolveGovernance(user, query.data.unitId, query.data.ownerUserId, { access: 'read' });
    const data = await getFactory().getTaxOptimizationService().listSuggestions(scope, query.data.status);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

const decide = (action: 'accept' | 'reject') => async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = TaxOptimizationIdParamSchema.safeParse(req.params);
    const body = DecideSuggestionSchema.safeParse(req.body);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const scope = await getFactory().getAccountingScopeResolver().resolveGovernance(user, body.data.unitId, body.data.ownerUserId, { access: 'write' });
    const svc = getFactory().getTaxOptimizationService();
    const data = action === 'accept' ? await svc.accept(scope, params.data.id, body.data) : await svc.reject(scope, params.data.id, body.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const acceptTaxSuggestion = decide('accept');
export const rejectTaxSuggestion = decide('reject');
