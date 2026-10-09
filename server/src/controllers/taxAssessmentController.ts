import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  TaxAssessmentConfirmSchema,
  TaxAssessmentListQuerySchema,
  TaxAssessmentPreviewSchema,
  TaxAssessmentScopeQuerySchema,
} from '../features/accounting/dtos/TaxAssessmentDto';
import { PisCofinsConfirmSchema, PisCofinsPreviewSchema } from '../features/accounting/dtos/PisCofinsDto';
import { TaxAssessmentPeriodosQuerySchema } from '../features/accounting/dtos/TaxAssessmentPeriodosDto';

/**
 * BE-INCR-TAX-ASSESSMENT Fase A PR-2 (nó X7, itens 13, 14, 17) — borda HTTP fina: auth → Zod safeParse → escopo →
 * service → handleApiError. `unitId` = unidade lida (corpo) ou só escopo/policy (query dos GET).
 */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

/** POST /api/accounting/tax-assessments/preview — não persiste. */
export const previewTaxAssessment = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = TaxAssessmentPreviewSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory().getTaxAssessmentService().preview(resolveAccountingScope(user, b.data.unitId), b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/tax-assessments — confirmação (commit 1). */
export const confirmTaxAssessment = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = TaxAssessmentConfirmSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory().getTaxAssessmentService().confirm(resolveAccountingScope(user, b.data.unitId), b.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/tax-assessments?unitId=&anoCalendario=&periodo=&status= */
export const listTaxAssessments = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = TaxAssessmentListQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getTaxAssessmentService().list(resolveAccountingScope(user, q.data.unitId), q.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/tax-assessments/periodos?unitId=&anoCalendario= — períodos esperados do ano por família (TAX-ASSESSMENT-PERIODOS). */
export const listPeriodos = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = TaxAssessmentPeriodosQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getTaxAssessmentPeriodosService().listar(resolveAccountingScope(user, q.data.unitId), q.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/tax-assessments/:id?unitId= */
export const getTaxAssessment = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = TaxAssessmentScopeQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getTaxAssessmentService().get(resolveAccountingScope(user, q.data.unitId), req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/tax-assessments/:id/provisao — reconcile idempotente da provisão (PR-3, item 16). */
export const reconcileTaxAssessmentProvisao = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = TaxAssessmentScopeQuerySchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory().getTaxAssessmentService().reconcileProvisao(resolveAccountingScope(user, b.data.unitId), req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/tax-assessments/pis-cofins/preview — PIS/Cofins do mês (X8 PR-2, item 13); não persiste. */
export const previewPisCofins = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = PisCofinsPreviewSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory().getPisCofinsAssessmentService().preview(resolveAccountingScope(user, b.data.unitId), b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/tax-assessments/pis-cofins — confirmação de PIS/Cofins do mês (X8 PR-2, item 14, commit 1). */
export const confirmPisCofins = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = PisCofinsConfirmSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory().getPisCofinsAssessmentService().confirm(resolveAccountingScope(user, b.data.unitId), b.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
