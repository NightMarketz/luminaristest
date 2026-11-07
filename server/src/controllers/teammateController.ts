import type { Request, Response } from 'express';
import { z, type ZodError } from 'zod';
import { handleApiError } from '@/lib/apiUtils';
import { getUserContextFromRequest } from '@/lib/authUtils';
import { getFactory } from '@/lib/factory';
import { TeammateCreateSchema, TeammateUpdateSchema } from '@/features/teammates/dtos/TeammatesDto';
import { ALCADA_INVALIDA } from '@/features/teammates/models/Teammate.model';

/** /api/teammates (BE-INCR-TEAMMATES PR-2, item 10; §2.4: CRUD). */
const idSchema = z.string().min(1);

/**
 * Item 11: `toolOverrides` com valor que não é `PROPOSTA` (ex.: marcar como LIVRE) é recusado pelo DTO; a resposta leva
 * o código `ALCADA_INVALIDA` do BRIEF em vez do genérico de validação.
 */
function badRequest(res: Response, error: ZodError) {
  const alcada = error.issues.some((i) => i.path[0] === 'toolOverrides');
  return res.status(400).json(
    alcada
      ? { success: false, code: ALCADA_INVALIDA, error: 'A alçada só aperta: toolOverrides aceita apenas PROPOSTA.' }
      : { success: false, error: error.flatten() },
  );
}

export async function listTeammates(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const data = await getFactory().getTeammateService().list(ctx);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function getTeammate(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ success: false, error: 'Invalid teammate ID' });
    const data = await getFactory().getTeammateService().get(ctx, id.data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function createTeammate(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const body = TeammateCreateSchema.safeParse(req.body);
    if (!body.success) return badRequest(res, body.error);
    const data = await getFactory().getTeammateService().create(ctx, body.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function updateTeammate(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ success: false, error: 'Invalid teammate ID' });
    const body = TeammateUpdateSchema.safeParse(req.body);
    if (!body.success) return badRequest(res, body.error);
    const data = await getFactory().getTeammateService().update(ctx, id.data, body.data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function deleteTeammate(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ success: false, error: 'Invalid teammate ID' });
    await getFactory().getTeammateService().remove(ctx, id.data);
    return res.status(200).json({ success: true, data: { id: id.data } });
  } catch (error) {
    return handleApiError(error, res);
  }
}
