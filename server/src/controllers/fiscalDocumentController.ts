import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  EmitFiscalDocumentSchema,
  FiscalDocumentListQuerySchema,
  FiscalDocumentParamsSchema,
  FiscalDocumentScopeQuerySchema,
  PreviewFiscalDocumentSchema,
} from '../features/accounting/dtos/FiscalDocumentDto';

/**
 * BE-INCR-DFE (nó X10b, BRIEF item 38) — GET /api/nfe/dfe/status, POST /preview, POST /documents,
 * GET /documents, GET /documents/:id. Fase D (consultar/reenviar/cancelar/webhook) fica no PR-3.
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
      .list(scope, { saleId: query.data.saleId, status: query.data.status });
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
