import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import {
  IbsCbsAssessmentConfirmSchema,
  IbsCbsAssessmentListQuerySchema,
  IbsCbsAssessmentPreviewSchema,
  IbsCbsAssessmentScopeQuerySchema,
} from '../features/accounting/dtos/IbsCbsAssessmentDto';

/**
 * IBS-CBS-2027 PR-2 (BRIEF item 13) — borda HTTP fina: auth → Zod safeParse → escopo → service → handleApiError.
 * Molde `taxAssessmentController`.
 */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

/** POST /api/accounting/ibs-cbs-assessments/preview — não persiste. */
export const previewIbsCbsAssessment = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = IbsCbsAssessmentPreviewSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory().getIbsCbsAssessmentService().preview(await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'read' }), b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/ibs-cbs-assessments — confirmação. */
export const confirmIbsCbsAssessment = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = IbsCbsAssessmentConfirmSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory().getIbsCbsAssessmentService().confirm(await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' }), b.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/ibs-cbs-assessments?unitId=&anoCalendario= */
export const listIbsCbsAssessments = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = IbsCbsAssessmentListQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getIbsCbsAssessmentService().list(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' }), q.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/ibs-cbs-assessments/:id/provisao?unitId= — reconcile da reclassificação (item 12; dono 21/10, molde X7). */
export const reconcileIbsCbsProvisao = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = IbsCbsAssessmentScopeQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getIbsCbsAssessmentService().reconcileIbsCbsProvisao(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'write' }), req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/ibs-cbs-assessments/:id/resumo?unitId= — saldo a recolher, vencimento e memória (PR-5 item 22). */
export const getIbsCbsResumo = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = IbsCbsAssessmentScopeQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getIbsCbsAssessmentService().resumo(await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' }), req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
