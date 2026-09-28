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
  RetornoManualBodySchema,
  RejeicaoManualSchema,
  CancelamentoManualSchema,
} from '../features/accounting/dtos/FiscalDocumentDto';
import { makeUploadFieldsMiddleware } from '../lib/uploadSecurity';

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


// ---- BE-INCR-DFE-MANUAL (itens 11–14, 16) — retorno manual do portal público ----

const XML_MIME_TYPES = new Set(['text/xml', 'application/xml', 'text/plain', 'application/octet-stream']);
const MAX_RETORNO_SIZE_BYTES = Number(process.env.MAX_IMPORT_SIZE_BYTES) || 10 * 1024 * 1024;

/** `file` = XML da NFS-e autorizada; `pdf` = DANFSe opcional. Magic bytes do XML desligados (O-3, mesmo do nfeUpload). */
export const retornoManualUpload = makeUploadFieldsMiddleware(
  [
    { name: 'file', allowedTypes: XML_MIME_TYPES },
    { name: 'pdf', allowedTypes: new Set(['application/pdf']) },
  ],
  MAX_RETORNO_SIZE_BYTES,
);
/** `file` = XML do evento de cancelamento e101101. */
export const eventoManualUpload = makeUploadFieldsMiddleware([{ name: 'file', allowedTypes: XML_MIME_TYPES }], MAX_RETORNO_SIZE_BYTES);

function uploaded(req: Request, field: string): Buffer | undefined {
  return (req as Request & { files?: Record<string, Express.Multer.File[]> }).files?.[field]?.[0]?.buffer;
}

/** POST /api/nfe/dfe/documents/:id/retorno-manual (item 11). */
export const retornoManualFiscalDocument = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = FiscalDocumentParamsSchema.safeParse(req.params);
    const body = RetornoManualBodySchema.safeParse(req.body);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const xml = uploaded(req, 'file');
    if (!xml) return res.status(400).json({ success: false, error: 'Envie o XML da NFS-e autorizada no campo "file".' });
    const scope = resolveAccountingScope(user, body.data.unitId);
    const data = await getFactory().getFiscalDocumentLifecycleService().retornoManual(scope, params.data.id, xml, uploaded(req, 'pdf'));
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/nfe/dfe/documents/:id/rejeicao-manual (item 12). */
export const rejeicaoManualFiscalDocument = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = FiscalDocumentParamsSchema.safeParse(req.params);
    const body = RejeicaoManualSchema.safeParse(req.body);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const scope = resolveAccountingScope(user, body.data.unitId);
    const data = await getFactory().getFiscalDocumentLifecycleService().rejeicaoManual(scope, params.data.id, body.data.errors);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * POST /api/nfe/dfe/documents/:id/cancelamento-manual (item 13). Multipart: campos de formulário chegam como texto,
 * então `cMotivo` vira número ANTES do Zod (mesmo padrão do decodeItemMappings do nfeController) — o DTO continua
 * validando a forma real.
 */
export const cancelamentoManualFiscalDocument = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = FiscalDocumentParamsSchema.safeParse(req.params);
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const body = CancelamentoManualSchema.safeParse({
      ...raw,
      ...(typeof raw.cMotivo === 'string' && /^\d$/.test(raw.cMotivo) ? { cMotivo: Number(raw.cMotivo) } : {}),
    });
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const xml = uploaded(req, 'file');
    if (!xml) return res.status(400).json({ success: false, error: 'Envie o XML do evento de cancelamento no campo "file".' });
    const scope = resolveAccountingScope(user, body.data.unitId);
    const data = await getFactory()
      .getFiscalDocumentLifecycleService()
      .cancelamentoManual(scope, params.data.id, { cMotivo: body.data.cMotivo, xMotivo: body.data.xMotivo }, xml);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/nfe/dfe/documents/:id/ficha (item 14). */
export const getFichaFiscalDocument = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = FiscalDocumentParamsSchema.safeParse(req.params);
    const query = FiscalDocumentScopeQuerySchema.safeParse(req.query);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const scope = resolveAccountingScope(user, query.data.unitId);
    const data = await getFactory().getFiscalDocumentEmissionService().ficha(scope, params.data.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
