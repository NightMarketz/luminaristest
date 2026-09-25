import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  CompanySignerIdParamSchema,
  CompanySignerScopeSchema,
  CreateCompanySignerSchema,
  UpdateCompanySignerSchema,
} from '../features/accounting/dtos/CompanySignerDto';

/** BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF item 8) — signatários da empresa (não-contador). */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

export const listCompanySigners = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = CompanySignerScopeSchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getCompanySignerService().list(resolveAccountingScope(user, q.data.unitId));
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getCompanySigner = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompanySignerIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = CompanySignerScopeSchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getCompanySignerService().get(resolveAccountingScope(user, q.data.unitId), p.data.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const createCompanySigner = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = CreateCompanySignerSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory().getCompanySignerService().create(resolveAccountingScope(user, b.data.unitId), b.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const updateCompanySigner = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompanySignerIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = UpdateCompanySignerSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory().getCompanySignerService().update(resolveAccountingScope(user, b.data.unitId), p.data.id, b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const deleteCompanySigner = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompanySignerIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = CompanySignerScopeSchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    await getFactory().getCompanySignerService().remove(resolveAccountingScope(user, q.data.unitId), p.data.id);
    return res.json({ success: true });
  } catch (error) {
    return handleApiError(error, res);
  }
};
