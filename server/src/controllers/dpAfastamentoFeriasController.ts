import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import type { AccountingScope } from '../features/accounting/scope/AccountingScope';
import type { DpAfastamentoFeriasService } from '../features/dp/services/DpAfastamentoFeriasService';
import { DpIdParamSchema, DpScopeQuerySchema } from '../features/dp/dtos/DpModuleDto';
import {
  CreateAfastamentoSchema,
  CreateFeriasImplantacaoSchema,
  DpAfastamentoIdParamSchema,
  DpFeriasImplantacaoIdParamSchema,
  DpFeriasQuerySchema,
  UpdateAfastamentoSchema,
  UpdateFeriasImplantacaoSchema,
} from '../features/dp/dtos/DpAfastamentoFeriasDto';

/**
 * BE-INCR-DP-F0-F1 itens 59–60 (PR-6) — `/api/dp/vinculos/:id/afastamentos` e `/api/dp/vinculos/:id/ferias/implantacao`
 * (CRUD: GET lista, POST, PATCH e DELETE `/:subId`) e `GET /api/dp/vinculos/:id/ferias` (períodos + dias implantados, sem
 * saldo). Escopo pelo `AccountingScopeResolver` com o `unitId` da query (GET/DELETE) ou do body (POST/PATCH), como o PR-4.
 */
type Ctx = { scope: AccountingScope; svc: DpAfastamentoFeriasService };
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
        svc: getFactory().getDpAfastamentoFeriasService(),
      });
      return await fn(req, res, resolve);
    } catch (error) {
      return handleApiError(error, res);
    }
  };
}

export const dpAfastamentos = {
  list: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpScopeQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'read');
    return res.json({ success: true, data: await svc.listAfastamentos(scope, p.data.id) });
  }),
  create: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const b = parse(CreateAfastamentoSchema, req.body, res);
    if (!b.ok) return;
    const { scope, svc } = await resolve(b.data.unitId, 'write');
    return res.status(201).json({ success: true, data: await svc.createAfastamento(scope, p.data.id, b.data) });
  }),
  update: handler(async (req, res, resolve) => {
    const p = parse(DpAfastamentoIdParamSchema, req.params, res);
    if (!p.ok) return;
    const b = parse(UpdateAfastamentoSchema, req.body, res);
    if (!b.ok) return;
    const { scope, svc } = await resolve(b.data.unitId, 'write');
    return res.json({ success: true, data: await svc.updateAfastamento(scope, p.data.id, p.data.afastamentoId, b.data) });
  }),
  remove: handler(async (req, res, resolve) => {
    const p = parse(DpAfastamentoIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpScopeQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'write');
    await svc.deleteAfastamento(scope, p.data.id, p.data.afastamentoId);
    return res.status(204).send();
  }),
};

export const dpFerias = {
  get: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpFeriasQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'read');
    return res.json({ success: true, data: await svc.getFerias(scope, p.data.id, q.data.dataRef) });
  }),
  listImplantacoes: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpScopeQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'read');
    return res.json({ success: true, data: await svc.listImplantacoes(scope, p.data.id) });
  }),
  createImplantacao: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const b = parse(CreateFeriasImplantacaoSchema, req.body, res);
    if (!b.ok) return;
    const { scope, svc } = await resolve(b.data.unitId, 'write');
    return res.status(201).json({ success: true, data: await svc.createImplantacao(scope, p.data.id, b.data) });
  }),
  updateImplantacao: handler(async (req, res, resolve) => {
    const p = parse(DpFeriasImplantacaoIdParamSchema, req.params, res);
    if (!p.ok) return;
    const b = parse(UpdateFeriasImplantacaoSchema, req.body, res);
    if (!b.ok) return;
    const { scope, svc } = await resolve(b.data.unitId, 'write');
    return res.json({ success: true, data: await svc.updateImplantacao(scope, p.data.id, p.data.implantacaoId, b.data) });
  }),
  removeImplantacao: handler(async (req, res, resolve) => {
    const p = parse(DpFeriasImplantacaoIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpScopeQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'write');
    await svc.deleteImplantacao(scope, p.data.id, p.data.implantacaoId);
    return res.status(204).send();
  }),
};
