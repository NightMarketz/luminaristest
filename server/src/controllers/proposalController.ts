import type { Request, Response } from 'express';
import { z } from 'zod';
import { handleApiError } from '@/lib/apiUtils';
import { getUserContextFromRequest } from '@/lib/authUtils';
import { getFactory } from '@/lib/factory';
import { ProposalListQuerySchema } from '@/features/teammates/dtos/TeammatesDto';

/** /api/proposals (BE-INCR-TEAMMATES PR-7, itens 31–32; §2.4: GET, POST /:id/confirm, POST /:id/reject). */
const idSchema = z.string().min(1);

export async function listProposals(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const query = ProposalListQuerySchema.safeParse(req.query);
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const data = await getFactory().getProposalInboxService().list(ctx, query.data.status);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function confirmProposal(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ success: false, error: 'Invalid proposal ID' });
    const data = await getFactory().getProposalInboxService().confirm(ctx, id.data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function rejectProposal(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ success: false, error: 'Invalid proposal ID' });
    const data = await getFactory().getProposalInboxService().reject(ctx, id.data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}
