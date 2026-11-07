import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import type { AccountingScope } from '../features/accounting/scope/AccountingScope';
import type { DpDependenteService } from '../features/dp/services/DpDependenteService';
import { DpIdParamSchema, DpScopeQuerySchema } from '../features/dp/dtos/DpModuleDto';
import { CreateDependenteSchema, DpDependenteIdParamSchema, UpdateDependenteSchema } from '../features/dp/dtos/DpDependenteDto';

/**
 * BE-INCR-DP-F2 item 20 (PR-1) — `/api/dp/trabalhadores/:id/dependentes` (GET lista, POST, PATCH e DELETE
 * `/:dependenteId`). Escopo pelo `AccountingScopeResolver` com o `unitId` da query (GET/DELETE) ou do body (POST/PATCH),
 * como o trabalhador.
 */
type Ctx = { scope: AccountingScope; svc: DpDependenteService };
type Parsed<T> = { ok: true; data: T } | { ok: false };

function parse<T>(schema: ZodType<T>, raw: unknown, res: Response): Parsed<T> {
  const r = schema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  res.status(400).json({ success: false, error: r.error.flatten() });
  return { ok: false };
}

function handler(fn: (req: Request, res: Response, resolve: (unitId: string, access: 'read' | 'write') => Promise<Ctx>) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      const user = getUserContextFromRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const resolve = async (unitId: string, access: 'read' | 'write'): Promise<Ctx> => ({
        scope: await getFactory().getAccountingScopeResolver().resolve(user, unitId, { access }),
        svc: getFactory().getDpDependenteService(),
      });
      return await fn(req, res, resolve);
    } catch (error) {
      return handleApiError(error, res);
    }
  };
}

export const dpDependentes = {
  list: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpScopeQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'read');
    return res.json({ success: true, data: await svc.list(scope, p.data.id) });
  }),
  create: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const b = parse(CreateDependenteSchema, req.body, res);
    if (!b.ok) return;
    const { scope, svc } = await resolve(b.data.unitId, 'write');
    return res.status(201).json({ success: true, data: await svc.create(scope, p.data.id, b.data) });
  }),
  update: handler(async (req, res, resolve) => {
    const p = parse(DpDependenteIdParamSchema, req.params, res);
    if (!p.ok) return;
    const b = parse(UpdateDependenteSchema, req.body, res);
    if (!b.ok) return;
    const { scope, svc } = await resolve(b.data.unitId, 'write');
    return res.json({ success: true, data: await svc.update(scope, p.data.id, p.data.dependenteId, b.data) });
  }),
  remove: handler(async (req, res, resolve) => {
    const p = parse(DpDependenteIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpScopeQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'write');
    await svc.remove(scope, p.data.id, p.data.dependenteId);
    return res.status(204).send();
  }),
};
