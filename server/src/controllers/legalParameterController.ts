import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import {
  ListLegalParametersQuerySchema,
  ListRecalcJobsQuerySchema,
  ProposeLegalParameterSchema,
  VigenteLegalParameterQuerySchema,
} from '../features/legalParameters/dtos/LegalParameterDto';

/**
 * BE-INCR-LEGAL-PARAMS PR-1 (item 11) — borda HTTP fina: auth → Zod safeParse → service → handleApiError. O papel
 * (`PLATFORM_ADMIN`) é decidido pela `LegalParameterPolicy`, não aqui.
 */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

function actorOf(req: Request): { userId: string; role: string } | null {
  const user = getUserContextFromRequest(req);
  return user ? { userId: user.userId, role: String(user.role) } : null;
}

/** GET /api/legal-parameters?tabela=&status= */
export const listLegalParameters = async (req: Request, res: Response) => {
  try {
    const actor = actorOf(req);
    if (!actor) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = ListLegalParametersQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    return res.json({ success: true, data: await getFactory().getLegalParameterService().list(actor, q.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/legal-parameters/recalc-jobs?status=&legalParameterId=&page=&pageSize= (RECALC-STATUS) */
export const listLegalParameterRecalcJobs = async (req: Request, res: Response) => {
  try {
    const actor = actorOf(req);
    if (!actor) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = ListRecalcJobsQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    return res.json({ success: true, data: await getFactory().getLegalParameterService().listRecalcJobs(actor, q.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/legal-parameters/vigente?tabela=&chave=&data=&discriminador= */
export const getVigenteLegalParameter = async (req: Request, res: Response) => {
  try {
    const actor = actorOf(req);
    if (!actor) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = VigenteLegalParameterQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    return res.json({ success: true, data: await getFactory().getLegalParameterService().vigente(actor, q.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/legal-parameters — propõe (DRAFT). */
export const proposeLegalParameter = async (req: Request, res: Response) => {
  try {
    const actor = actorOf(req);
    if (!actor) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = ProposeLegalParameterSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    return res.status(201).json({ success: true, data: await getFactory().getLegalParameterService().propose(actor, b.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/legal-parameters/:id/publish */
export const publishLegalParameter = async (req: Request, res: Response) => {
  try {
    const actor = actorOf(req);
    if (!actor) return res.status(401).json({ success: false, error: 'Unauthorized' });
    return res.json({ success: true, data: await getFactory().getLegalParameterService().publish(actor, String(req.params.id)) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/legal-parameters/:id/revoke */
export const revokeLegalParameter = async (req: Request, res: Response) => {
  try {
    const actor = actorOf(req);
    if (!actor) return res.status(401).json({ success: false, error: 'Unauthorized' });
    return res.json({ success: true, data: await getFactory().getLegalParameterService().revoke(actor, String(req.params.id)) });
  } catch (error) {
    return handleApiError(error, res);
  }
};
