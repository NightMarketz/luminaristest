import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import type { AccountingScope } from '../features/accounting/scope/AccountingScope';
import type { DpCadastroService } from '../features/dp/services/DpCadastroService';
import { DpIdParamSchema, DpScopeQuerySchema } from '../features/dp/dtos/DpModuleDto';
import {
  CreateCargoSchema,
  CreateConvencaoParametroSchema,
  CreateConvencaoSchema,
  CreateJornadaSchema,
  CreateLotacaoSchema,
  CreateSindicatoSchema,
  DpListQuerySchema,
  DpParametroIdParamSchema,
  UpdateCargoSchema,
  UpdateConvencaoParametroSchema,
  UpdateConvencaoSchema,
  UpdateJornadaSchema,
  UpdateLotacaoSchema,
  UpdateSindicatoSchema,
} from '../features/dp/dtos/DpCadastrosDto';

/**
 * BE-INCR-DP-F0-F1 item 35 (PR-3) — cadastros de estrutura do DP em `/api/dp/{lotacoes,cargos,jornadas,sindicatos,
 * convencoes}` e `/api/dp/convencoes/:id/parametros`. Escopo pelo `AccountingScopeResolver` com o `unitId` da query
 * (GET/DELETE) ou do body (POST/PATCH), como `/api/dp/modules`; os cadastros são por instância.
 */
type Ctx = { scope: AccountingScope; svc: DpCadastroService };
type Parsed<T> = { ok: true; data: T } | { ok: false };

function parse<T>(schema: ZodType<T>, raw: unknown, res: Response): Parsed<T> {
  const r = schema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  res.status(400).json({ success: false, error: r.error.flatten() });
  return { ok: false };
}

/** 401 sem usuário; resolve o escopo; delega; erros pelo `handleApiError`. */
function handler(fn: (req: Request, res: Response, resolve: (unitId: string, access: 'read' | 'write') => Promise<Ctx>) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      const user = getUserContextFromRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const resolve = async (unitId: string, access: 'read' | 'write'): Promise<Ctx> => ({
        scope: await getFactory().getAccountingScopeResolver().resolve(user, unitId, { access }),
        svc: getFactory().getDpCadastroService(),
      });
      return await fn(req, res, resolve);
    } catch (error) {
      return handleApiError(error, res);
    }
  };
}

interface Crud<C, U> {
  list: (svc: DpCadastroService, scope: AccountingScope, limit: number) => Promise<unknown>;
  get: (svc: DpCadastroService, scope: AccountingScope, id: string) => Promise<unknown>;
  create: (svc: DpCadastroService, scope: AccountingScope, input: C) => Promise<unknown>;
  update: (svc: DpCadastroService, scope: AccountingScope, id: string, input: U) => Promise<unknown>;
  remove: (svc: DpCadastroService, scope: AccountingScope, id: string) => Promise<void>;
  createSchema: ZodType<C & { unitId: string }>;
  updateSchema: ZodType<U & { unitId: string }>;
}

function crud<C, U>(c: Crud<C, U>) {
  return {
    list: handler(async (req, res, resolve) => {
      const q = parse(DpListQuerySchema, req.query, res);
      if (!q.ok) return;
      const { scope, svc } = await resolve(q.data.unitId, 'read');
      return res.json({ success: true, data: await c.list(svc, scope, q.data.limit) });
    }),
    get: handler(async (req, res, resolve) => {
      const p = parse(DpIdParamSchema, req.params, res);
      if (!p.ok) return;
      const q = parse(DpScopeQuerySchema, req.query, res);
      if (!q.ok) return;
      const { scope, svc } = await resolve(q.data.unitId, 'read');
      return res.json({ success: true, data: await c.get(svc, scope, p.data.id) });
    }),
    create: handler(async (req, res, resolve) => {
      const b = parse(c.createSchema, req.body, res);
      if (!b.ok) return;
      const { scope, svc } = await resolve(b.data.unitId, 'write');
      return res.status(201).json({ success: true, data: await c.create(svc, scope, b.data) });
    }),
    update: handler(async (req, res, resolve) => {
      const p = parse(DpIdParamSchema, req.params, res);
      if (!p.ok) return;
      const b = parse(c.updateSchema, req.body, res);
      if (!b.ok) return;
      const { scope, svc } = await resolve(b.data.unitId, 'write');
      return res.json({ success: true, data: await c.update(svc, scope, p.data.id, b.data) });
    }),
    remove: handler(async (req, res, resolve) => {
      const p = parse(DpIdParamSchema, req.params, res);
      if (!p.ok) return;
      const q = parse(DpScopeQuerySchema, req.query, res);
      if (!q.ok) return;
      const { scope, svc } = await resolve(q.data.unitId, 'write');
      await c.remove(svc, scope, p.data.id);
      return res.status(204).send();
    }),
  };
}

export const dpLotacoes = crud({
  list: (s, sc, l) => s.listLotacoes(sc, l),
  get: (s, sc, id) => s.getLotacao(sc, id),
  create: (s, sc, i) => s.createLotacao(sc, i),
  update: (s, sc, id, i) => s.updateLotacao(sc, id, i),
  remove: (s, sc, id) => s.deleteLotacao(sc, id),
  createSchema: CreateLotacaoSchema,
  updateSchema: UpdateLotacaoSchema,
});

export const dpCargos = crud({
  list: (s, sc, l) => s.listCargos(sc, l),
  get: (s, sc, id) => s.getCargo(sc, id),
  create: (s, sc, i) => s.createCargo(sc, i),
  update: (s, sc, id, i) => s.updateCargo(sc, id, i),
  remove: (s, sc, id) => s.deleteCargo(sc, id),
  createSchema: CreateCargoSchema,
  updateSchema: UpdateCargoSchema,
});

export const dpJornadas = crud({
  list: (s, sc, l) => s.listJornadas(sc, l),
  get: (s, sc, id) => s.getJornada(sc, id),
  create: (s, sc, i) => s.createJornada(sc, i),
  update: (s, sc, id, i) => s.updateJornada(sc, id, i),
  remove: (s, sc, id) => s.deleteJornada(sc, id),
  createSchema: CreateJornadaSchema,
  updateSchema: UpdateJornadaSchema,
});

export const dpSindicatos = crud({
  list: (s, sc, l) => s.listSindicatos(sc, l),
  get: (s, sc, id) => s.getSindicato(sc, id),
  create: (s, sc, i) => s.createSindicato(sc, i),
  update: (s, sc, id, i) => s.updateSindicato(sc, id, i),
  remove: (s, sc, id) => s.deleteSindicato(sc, id),
  createSchema: CreateSindicatoSchema,
  updateSchema: UpdateSindicatoSchema,
});

export const dpConvencoes = crud({
  list: (s, sc, l) => s.listConvencoes(sc, l),
  get: (s, sc, id) => s.getConvencao(sc, id),
  create: (s, sc, i) => s.createConvencao(sc, i),
  update: (s, sc, id, i) => s.updateConvencao(sc, id, i),
  remove: (s, sc, id) => s.deleteConvencao(sc, id),
  createSchema: CreateConvencaoSchema,
  updateSchema: UpdateConvencaoSchema,
});

export const dpConvencaoParametros = {
  list: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpScopeQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'read');
    return res.json({ success: true, data: await svc.listParametros(scope, p.data.id) });
  }),
  create: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const b = parse(CreateConvencaoParametroSchema, req.body, res);
    if (!b.ok) return;
    const { scope, svc } = await resolve(b.data.unitId, 'write');
    return res.status(201).json({ success: true, data: await svc.createParametro(scope, p.data.id, b.data) });
  }),
  update: handler(async (req, res, resolve) => {
    const p = parse(DpParametroIdParamSchema, req.params, res);
    if (!p.ok) return;
    const b = parse(UpdateConvencaoParametroSchema, req.body, res);
    if (!b.ok) return;
    const { scope, svc } = await resolve(b.data.unitId, 'write');
    return res.json({ success: true, data: await svc.updateParametro(scope, p.data.id, p.data.parametroId, b.data) });
  }),
  remove: handler(async (req, res, resolve) => {
    const p = parse(DpParametroIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpScopeQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'write');
    await svc.deleteParametro(scope, p.data.id, p.data.parametroId);
    return res.status(204).send();
  }),
};
