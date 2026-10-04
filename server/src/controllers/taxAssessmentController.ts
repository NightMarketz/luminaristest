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

/**
 * BE-INCR-TAX-ASSESSMENT Fase A (nó X7, BRIEF itens 13, 14, 17) — apuração trimestral de IRPJ/CSLL. Thin controllers:
 * auth → Zod safeParse → resolve scope → delegate → handleApiError. `unitId` resolve escopo/policy e é a unidade lida.
 */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

/** POST /api/accounting/tax-assessments/preview — calcula; não persiste. */
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

/** GET /api/accounting/tax-assessments/:id?unitId= */
export const getTaxAssessment = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = TaxAssessmentScopeQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getTaxAssessmentService().getById(resolveAccountingScope(user, q.data.unitId), req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
