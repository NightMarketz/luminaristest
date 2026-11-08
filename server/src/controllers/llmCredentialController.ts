import type { Request, Response } from 'express';
import { z } from 'zod';
import { handleApiError } from '@/lib/apiUtils';
import { getUserContextFromRequest } from '@/lib/authUtils';
import { getFactory } from '@/lib/factory';
import { LlmCredentialCreateSchema } from '@/features/teammates/dtos/TeammatesDto';

/** /api/teammates/credentials (BE-INCR-TEAMMATES PR-1, item 7; §2.4: POST, GET, DELETE). */
const idSchema = z.string().min(1);

export async function listLlmCredentials(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const data = await getFactory().getLlmCredentialService().list(ctx);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function createLlmCredential(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const body = LlmCredentialCreateSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const data = await getFactory().getLlmCredentialService().create(ctx, body.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function deleteLlmCredential(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ success: false, error: 'Invalid credential ID' });
    await getFactory().getLlmCredentialService().remove(ctx, id.data);
    return res.status(200).json({ success: true, data: { id: id.data } });
  } catch (error) {
    return handleApiError(error, res);
  }
}
