import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  ApprovePolicyVersionSchema,
  ListPolicyVersionsQuerySchema,
  PolicyVersionScopeQuerySchema,
  ProposePolicyVersionSchema,
  RejectPolicyVersionSchema,
} from '../features/accounting/dtos/AccountingPolicyVersionDto';

/**
 * Política versionada com aprovação do contador (BE-INCR-ACCOUNTING-POLICY-VERSION, nó GOV-CONTADOR, BRIEF §4.4) —
 * borda HTTP. A proposta usa o resolver padrão (o dono no próprio livro); leitura, aprovação e rejeição usam o
 * resolver DELEGADO pelo par (contador, dono) — os handlers delegados do F-GOV-7 vão de 9 para 13; nenhum escreve no
 * razão.
 */

/** POST /api/accounting/policy-versions — o dono propõe (item 7). */
export const proposePolicyVersion = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ProposePolicyVersionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getAccountingPolicyVersionService().propose(scope, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/policy-versions?unitId=&target=&status=&ownerUserId= — histórico (item 8). */
export const listPolicyVersions = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ListPolicyVersionsQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const { unitId, ownerUserId, target, status } = parsed.data;
    const scope = await getFactory().getAccountantAssignmentService().resolveGovernanceScope(user, unitId, ownerUserId);
    const data = await getFactory().getAccountingPolicyVersionService().list(scope, { target, status });
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/policy-versions/:id?unitId=&ownerUserId= — detalhe com o estado atual do alvo (item 8). */
export const getPolicyVersion = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = PolicyVersionScopeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = await getFactory().getAccountantAssignmentService().resolveGovernanceScope(user, parsed.data.unitId, parsed.data.ownerUserId);
    const data = await getFactory().getAccountingPolicyVersionService().get(scope, req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/policy-versions/:id/approve — o contador aprova e aplica (item 9). */
export const approvePolicyVersion = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ApprovePolicyVersionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = await getFactory().getAccountantAssignmentService().resolveGovernanceScope(user, parsed.data.unitId, parsed.data.ownerUserId);
    const data = await getFactory().getAccountingPolicyVersionService().approve(scope, req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/policy-versions/:id/reject — o contador rejeita com motivo (item 10). */
export const rejectPolicyVersion = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = RejectPolicyVersionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = await getFactory().getAccountantAssignmentService().resolveGovernanceScope(user, parsed.data.unitId, parsed.data.ownerUserId);
    const data = await getFactory().getAccountingPolicyVersionService().reject(scope, req.params.id, parsed.data.reason);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
