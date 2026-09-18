import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  CancelFiscalDocumentSchema,
  EmitFiscalDocumentSchema,
  FiscalDocumentActionBodySchema,
  FiscalDocumentListQuerySchema,
  FiscalDocumentParamsSchema,
  FiscalDocumentScopeQuerySchema,
  PreviewFiscalDocumentSchema,
  WebhookParamsSchema,
} from '../features/accounting/dtos/FiscalDocumentDto';

/**
 * BE-INCR-DFE (nó X10b, BRIEF item 38) — GET /api/nfe/dfe/status, POST /preview, POST/GET
 * /documents, GET /documents/:id (Fase B+C, PR-2) + POST /documents/:id/consultar|reenviar|cancelar
 * e POST /webhook/:partner (Fase D, PR-3).
 */

export const getDfeStatus = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const data = getFactory().getFiscalDocumentEmissionService().getStatus();
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const previewFiscalDocument = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const body = PreviewFiscalDocumentSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const scope = resolveAccountingScope(user, body.data.unitId);
    const data = await getFactory().getFiscalDocumentEmissionService().preview(scope, body.data.saleId, body.data.kind);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const emitFiscalDocument = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const body = EmitFiscalDocumentSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const scope = resolveAccountingScope(user, body.data.unitId);
    const data = await getFactory().getFiscalDocumentEmissionService().emit(scope, body.data.saleId, body.data.kind);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const listFiscalDocuments = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const query = FiscalDocumentListQuerySchema.safeParse(req.query);
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const scope = resolveAccountingScope(user, query.data.unitId);
    const data = await getFactory()
      .getFiscalDocumentEmissionService()
      .list(scope, { saleId: query.data.saleId, status: query.data.status, pendencias: query.data.pendencias });
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getFiscalDocument = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = FiscalDocumentParamsSchema.safeParse(req.params);
    const query = FiscalDocumentScopeQuerySchema.safeParse(req.query);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const scope = resolveAccountingScope(user, query.data.unitId);
    const data = await getFactory().getFiscalDocumentEmissionService().getById(scope, params.data.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

// ---- Fase D (PR-3) ----

export const consultarFiscalDocument = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = FiscalDocumentParamsSchema.safeParse(req.params);
    const body = FiscalDocumentActionBodySchema.safeParse(req.body);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const scope = resolveAccountingScope(user, body.data.unitId);
    const data = await getFactory().getFiscalDocumentLifecycleService().consultarUm(scope, params.data.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const reenviarFiscalDocument = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = FiscalDocumentParamsSchema.safeParse(req.params);
    const body = FiscalDocumentActionBodySchema.safeParse(req.body);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const scope = resolveAccountingScope(user, body.data.unitId);
    const data = await getFactory().getFiscalDocumentLifecycleService().reenviar(scope, params.data.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const cancelarFiscalDocument = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = FiscalDocumentParamsSchema.safeParse(req.params);
    const body = CancelFiscalDocumentSchema.safeParse(req.body);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const scope = resolveAccountingScope(user, body.data.unitId);
    const data = await getFactory()
      .getFiscalDocumentLifecycleService()
      .cancelar(scope, params.data.id, { cMotivo: body.data.cMotivo, xMotivo: body.data.xMotivo });
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * POST /api/nfe/dfe/webhook/:partner (item 28) — rota PÚBLICA (ver `publicApiRoutes` em
 * middleware/auth.ts). SEM `getUserContextFromRequest` — não há usuário autenticado aqui, de
 * propósito. `req.rawBody` vem do `verify` de `express.json()` em app.ts.
 */
export const receiveDfeWebhook = async (req: Request, res: Response) => {
  try {
    const params = WebhookParamsSchema.safeParse(req.params);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.alloc(0);
    const result = await getFactory().getFiscalDocumentLifecycleService().webhookReceived(params.data.partner, req.headers as Record<string, string | undefined>, rawBody);
    return res.status(result.status).json({ success: result.status < 400 });
  } catch (error) {
    return handleApiError(error, res);
  }
};
