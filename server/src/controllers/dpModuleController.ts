import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { AtivarModuloSchema, DpIdParamSchema, DpScopeQuerySchema, EncerrarModuloSchema } from '../features/dp/dtos/DpModuleDto';

/**
 * BE-INCR-DP-F0-F1 item 15 (PR-1) — submódulos opcionais do DP em `/api/dp/modules`. Escopo pelo
 * `AccountingScopeResolver` com o `unitId` da query ou do body (como `/api/accounting/partners`); a ativação é por
 * instância e grava só o dono.
 */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

export const listDpModules = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = DpScopeQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' });
    return res.json({ success: true, data: getFactory().getDpModuleService().listCatalog(scope) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const listDpModuleActivations = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = DpScopeQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, q.data.unitId, { access: 'read' });
    return res.json({ success: true, data: await getFactory().getDpModuleService().listActivations(scope) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const activateDpModule = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = AtivarModuloSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' });
    return res.status(201).json({ success: true, data: await getFactory().getDpModuleService().activate(scope, b.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const endDpModuleActivation = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = DpIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = EncerrarModuloSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, b.data.unitId, { access: 'write' });
    return res.json({ success: true, data: await getFactory().getDpModuleService().end(scope, p.data.id, b.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};
