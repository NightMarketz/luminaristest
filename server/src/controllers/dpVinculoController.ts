import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import type { AccountingScope } from '../features/accounting/scope/AccountingScope';
import type { DpVinculoService } from '../features/dp/services/DpVinculoService';
import { DpIdParamSchema, DpScopeQuerySchema } from '../features/dp/dtos/DpModuleDto';
import { DpListQuerySchema } from '../features/dp/dtos/DpCadastrosDto';
import {
  CorrigirVersaoSchema,
  CreateTrabalhadorSchema,
  CreateVersaoSchema,
  CreateVinculoSchema,
  DpVersaoIdParamSchema,
  UpdateTrabalhadorSchema,
} from '../features/dp/dtos/DpVinculoDto';

/**
 * BE-INCR-DP-F0-F1 item 46 (PR-4) — `/api/dp/trabalhadores` (CRUD), `/api/dp/vinculos` (POST cria vínculo + 1ª versão
 * numa tx; GET lista e detalhe com as versões; DELETE) e `/api/dp/vinculos/:id/versoes` (POST versão nova; PATCH
 * `/:versaoId` corrige). Escopo pelo `AccountingScopeResolver` com o `unitId` da query (GET/DELETE) ou do body
 * (POST/PATCH), como os cadastros do PR-3.
 */
type Ctx = { scope: AccountingScope; svc: DpVinculoService };
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
        svc: getFactory().getDpVinculoService(),
      });
      return await fn(req, res, resolve);
    } catch (error) {
      return handleApiError(error, res);
    }
  };
}

export const dpTrabalhadores = {
  list: handler(async (req, res, resolve) => {
    const q = parse(DpListQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'read');
    return res.json({ success: true, data: await svc.listTrabalhadores(scope, q.data.limit) });
  }),
  get: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpScopeQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'read');
    return res.json({ success: true, data: await svc.getTrabalhador(scope, p.data.id) });
  }),
  create: handler(async (req, res, resolve) => {
    const b = parse(CreateTrabalhadorSchema, req.body, res);
    if (!b.ok) return;
    const { scope, svc } = await resolve(b.data.unitId, 'write');
    return res.status(201).json({ success: true, data: await svc.createTrabalhador(scope, b.data) });
  }),
  update: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const b = parse(UpdateTrabalhadorSchema, req.body, res);
    if (!b.ok) return;
    const { scope, svc } = await resolve(b.data.unitId, 'write');
    return res.json({ success: true, data: await svc.updateTrabalhador(scope, p.data.id, b.data) });
  }),
  remove: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpScopeQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'write');
    await svc.deleteTrabalhador(scope, p.data.id);
    return res.status(204).send();
  }),
};

export const dpVinculos = {
  list: handler(async (req, res, resolve) => {
    const q = parse(DpListQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'read');
    return res.json({ success: true, data: await svc.listVinculos(scope, q.data.limit) });
  }),
  get: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpScopeQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'read');
    return res.json({ success: true, data: await svc.getVinculo(scope, p.data.id) });
  }),
  create: handler(async (req, res, resolve) => {
    const b = parse(CreateVinculoSchema, req.body, res);
    if (!b.ok) return;
    const { scope, svc } = await resolve(b.data.unitId, 'write');
    return res.status(201).json({ success: true, data: await svc.createVinculo(scope, b.data) });
  }),
  remove: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpScopeQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'write');
    await svc.deleteVinculo(scope, p.data.id);
    return res.status(204).send();
  }),
  createVersao: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const b = parse(CreateVersaoSchema, req.body, res);
    if (!b.ok) return;
    const { scope, svc } = await resolve(b.data.unitId, 'write');
    return res.status(201).json({ success: true, data: await svc.createVersao(scope, p.data.id, b.data) });
  }),
  corrigirVersao: handler(async (req, res, resolve) => {
    const p = parse(DpVersaoIdParamSchema, req.params, res);
    if (!p.ok) return;
    const b = parse(CorrigirVersaoSchema, req.body, res);
    if (!b.ok) return;
    const { scope, svc } = await resolve(b.data.unitId, 'write');
    return res.json({ success: true, data: await svc.corrigirVersao(scope, p.data.id, p.data.versaoId, b.data) });
  }),
};
