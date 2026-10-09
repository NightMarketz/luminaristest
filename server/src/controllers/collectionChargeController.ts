import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  CancelChargeSchema,
  CollectionChargeScopeQuerySchema,
  CollectionWebhookParamsSchema,
  CreateChargeSchema,
} from '../features/accounting/dtos/CollectionChargeDto';

/**
 * Cobrança por provedor (BE-INCR-PAYMENT-PROVIDER PR-2, P2-2/P2-5/P2-10/P2-11/P2-15) — borda HTTP fina:
 * auth → Zod safeParse → escopo → service → handleApiError. Nenhuma resposta carrega credencial (PP-D7).
 */

/** POST /api/receivables/:receivableId/charges */
export const createCollectionCharge = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = CreateChargeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getCollectionChargeService().create(scope, req.params.receivableId, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/receivables/:receivableId/charges?unitId= */
export const listCollectionCharges = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = CollectionChargeScopeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getCollectionChargeService().listByReceivable(scope, req.params.receivableId);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/receivables/:receivableId/charges/payer-suggestion?unitId= */
export const getPayerSuggestion = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = CollectionChargeScopeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getCollectionChargeService().payerSuggestion(scope, req.params.receivableId);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/collection-charges/:id?unitId= */
export const getCollectionCharge = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = CollectionChargeScopeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getCollectionChargeService().get(scope, req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/collection-charges/:id/cancel */
export const cancelCollectionCharge = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = CancelChargeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getCollectionChargeService().cancel(scope, req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * POST /api/payment-collection/webhook/:provider/:accountId (P2-5) — rota PÚBLICA (`publicApiRoutes` em
 * middleware/auth.ts). SEM usuário autenticado, de propósito: a prova é a assinatura `x-signature` da conta.
 * O corpo não é lido — quem transiciona é a re-consulta (invariante 2).
 */
export const receiveCollectionWebhook = async (req: Request, res: Response) => {
  try {
    const params = CollectionWebhookParamsSchema.safeParse(req.params);
    if (!params.success) return res.status(401).json({ success: false });
    const result = await getFactory()
      .getCollectionChargeService()
      .webhookReceived(params.data.provider, params.data.accountId, req.headers, req.query as Record<string, unknown>);
    return res.status(result.status).json({ success: result.status < 400 });
  } catch (error) {
    return handleApiError(error, res);
  }
};
