import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  CreatePaymentAccountSchema,
  PaymentAccountScopeQuerySchema,
  SetCredentialSchema,
  UnblockReleaseReportSchema,
  UpdatePaymentAccountSchema,
} from '../features/accounting/dtos/PaymentAccountDto';

/**
 * Conta de pagamento no provedor (BE-INCR-PAYMENT-PROVIDER PR-1, P1-9) — borda HTTP fina: auth → Zod
 * safeParse → escopo → service → handleApiError. Nenhuma resposta carrega a credencial (PP-D7): o PUT da
 * credencial devolve a mesma projeção pública dos GET.
 */

/** GET /api/payment-accounts?unitId= */
export const listPaymentAccounts = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = PaymentAccountScopeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getPaymentAccountService().list(scope);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/payment-accounts/:id?unitId= */
export const getPaymentAccount = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = PaymentAccountScopeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getPaymentAccountService().get(scope, req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/payment-accounts — nasce DRAFT, sem credencial. */
export const createPaymentAccount = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = CreatePaymentAccountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getPaymentAccountService().create(scope, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** PATCH /api/payment-accounts/:id — label e ACTIVE↔DISABLED. */
export const updatePaymentAccount = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = UpdatePaymentAccountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getPaymentAccountService().update(scope, req.params.id, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** PUT /api/payment-accounts/:id/credential — só escrita; 503 sem chave-mestra. */
export const setPaymentAccountCredential = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = SetCredentialSchema.safeParse(req.body);
    // O flatten do Zod devolve só a mensagem por campo, nunca o valor recebido — o token não ecoa no 400.
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getPaymentAccountService().setCredential(scope, req.params.id, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/payment-accounts/:id/release-report/unblock — operador destrava o job do relatório (review #615, A2). */
export const unblockPaymentAccountReleaseReport = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = UnblockReleaseReportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getPaymentAccountService().unblockReleaseReport(scope, req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** DELETE /api/payment-accounts/:id?unitId= — soft-delete. */
export const deletePaymentAccount = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = PaymentAccountScopeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    await getFactory().getPaymentAccountService().remove(scope, req.params.id);
    return res.json({ success: true });
  } catch (error) {
    return handleApiError(error, res);
  }
};
