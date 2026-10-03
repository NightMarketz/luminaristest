import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  AcceptAccountantAssignmentSchema,
  EndAccountantAssignmentSchema,
  InviteAccountantSchema,
  ListAccountantAssignmentsQuerySchema,
} from '../features/accounting/dtos/AccountantAssignmentDto';
import { toAccountantAssignmentView } from '../features/accounting/services/AccountantAssignmentService';

/**
 * Contador responsável por escopo (BE-INCR-ACCOUNTANT-GOVERNANCE, nó GOV-CONTADOR, BRIEF §4.4) — borda HTTP.
 * Convite e listagem do escopo usam o resolver padrão (o dono no próprio livro); aceite e encerramento
 * resolvem pela linha; `/mine` pelo ator.
 */

/** POST /api/accounting/accountant-assignments — o dono convida (item 6). */
export const inviteAccountant = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = InviteAccountantSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getAccountantAssignmentService().invite(scope, parsed.data);
    return res.status(201).json({ success: true, data: toAccountantAssignmentView(data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/accountant-assignments?unitId= — histórico do escopo (item 9). */
export const listAccountantAssignments = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ListAccountantAssignmentsQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const rows = await getFactory().getAccountantAssignmentService().listByScope(scope);
    return res.json({ success: true, data: rows.map(toAccountantAssignmentView) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/accountant-assignments/mine — PENDING + ACTIVE do contador logado (item 9). */
export const listMyAccountantAssignments = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const data = await getFactory().getAccountantAssignmentService().listMine(user.userId);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/accountant-assignments/:id/accept — o contador aceita (item 7). */
export const acceptAccountantAssignment = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = AcceptAccountantAssignmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const data = await getFactory().getAccountantAssignmentService().accept(user.userId, req.params.id);
    return res.json({ success: true, data: toAccountantAssignmentView(data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/accountant-assignments/:id/end — dono ou contador encerra (item 8). */
export const endAccountantAssignment = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = EndAccountantAssignmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const data = await getFactory().getAccountantAssignmentService().end(user.userId, req.params.id, parsed.data);
    return res.json({ success: true, data: toAccountantAssignmentView(data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};
