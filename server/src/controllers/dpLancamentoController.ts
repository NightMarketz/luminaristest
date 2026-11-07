import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import type { AccountingScope } from '../features/accounting/scope/AccountingScope';
import type { DpLancamentoService } from '../features/dp/services/DpLancamentoService';
import { DpIdParamSchema, DpScopeQuerySchema } from '../features/dp/dtos/DpModuleDto';
import {
  CreateLancamentoSchema,
  CreateOutraRemuneracaoSchema,
  DpLancamentoIdParamSchema,
  DpLancamentoQuerySchema,
  DpOutraRemuneracaoIdParamSchema,
  UpdateLancamentoSchema,
  UpdateOutraRemuneracaoSchema,
} from '../features/dp/dtos/DpLancamentoDto';
import { dpValidationError } from '../features/dp/models/erros';

/**
 * BE-INCR-DP-F2 itens 20 e 77 (PR-1) — `/api/dp/vinculos/:id/lancamentos` (filtro `?competencia=`) e
 * `/api/dp/vinculos/:id/outras-remuneracoes` (GET lista, POST, PATCH e DELETE `/:subId`). Escopo pelo
 * `AccountingScopeResolver` com o `unitId` da query (GET/DELETE) ou do body (POST/PATCH), como o PR-6 do F0+F1.
 * O corpo recusado pelo schema sai como 400 `DP_LANCAMENTO_INVALIDO` com o campo (itens 17 e 78), como a recusa do serviço.
 */
type Ctx = { scope: AccountingScope; svc: DpLancamentoService };
type Parsed<T> = { ok: true; data: T } | { ok: false };

function parse<T>(schema: ZodType<T>, raw: unknown, res: Response): Parsed<T> {
  const r = schema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  res.status(400).json({ success: false, error: r.error.flatten() });
  return { ok: false };
}

/** Itens 17/78 — corpo inválido ⇒ `DP_LANCAMENTO_INVALIDO` com o primeiro campo recusado (o `handleApiError` formata). */
function parseCorpo<T>(schema: ZodType<T>, raw: unknown): T {
  const r = schema.safeParse(raw);
  if (r.success) return r.data;
  const issue = r.error.issues[0];
  // Campo a mais (`.strict()`) não tem `path`: o nome vem em `keys`.
  const extra = issue && 'keys' in issue && Array.isArray(issue.keys) ? String(issue.keys[0]) : null;
  const campo = issue?.path.length ? String(issue.path[0]) : extra;
  throw dpValidationError('DP_LANCAMENTO_INVALIDO', `Corpo inválido${campo ? ` em ${campo}` : ''}: ${issue?.message ?? 'schema'}.`, {
    campo,
    fieldErrors: r.error.flatten().fieldErrors,
  });
}

function handler(fn: (req: Request, res: Response, resolve: (unitId: string, access: 'read' | 'write') => Promise<Ctx>) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      const user = getUserContextFromRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const resolve = async (unitId: string, access: 'read' | 'write'): Promise<Ctx> => ({
        scope: await getFactory().getAccountingScopeResolver().resolve(user, unitId, { access }),
        svc: getFactory().getDpLancamentoService(),
      });
      return await fn(req, res, resolve);
    } catch (error) {
      return handleApiError(error, res);
    }
  };
}

export const dpLancamentos = {
  list: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpLancamentoQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'read');
    return res.json({ success: true, data: await svc.listLancamentos(scope, p.data.id, q.data.competencia ?? null) });
  }),
  create: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const b = parseCorpo(CreateLancamentoSchema, req.body);
    const { scope, svc } = await resolve(b.unitId, 'write');
    return res.status(201).json({ success: true, data: await svc.createLancamento(scope, p.data.id, b) });
  }),
  update: handler(async (req, res, resolve) => {
    const p = parse(DpLancamentoIdParamSchema, req.params, res);
    if (!p.ok) return;
    const b = parseCorpo(UpdateLancamentoSchema, req.body);
    const { scope, svc } = await resolve(b.unitId, 'write');
    return res.json({ success: true, data: await svc.updateLancamento(scope, p.data.id, p.data.lancamentoId, b) });
  }),
  remove: handler(async (req, res, resolve) => {
    const p = parse(DpLancamentoIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpScopeQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'write');
    await svc.deleteLancamento(scope, p.data.id, p.data.lancamentoId);
    return res.status(204).send();
  }),
};

export const dpOutrasRemuneracoes = {
  list: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpScopeQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'read');
    return res.json({ success: true, data: await svc.listOutrasRemuneracoes(scope, p.data.id) });
  }),
  create: handler(async (req, res, resolve) => {
    const p = parse(DpIdParamSchema, req.params, res);
    if (!p.ok) return;
    const b = parseCorpo(CreateOutraRemuneracaoSchema, req.body);
    const { scope, svc } = await resolve(b.unitId, 'write');
    return res.status(201).json({ success: true, data: await svc.createOutraRemuneracao(scope, p.data.id, b) });
  }),
  update: handler(async (req, res, resolve) => {
    const p = parse(DpOutraRemuneracaoIdParamSchema, req.params, res);
    if (!p.ok) return;
    const b = parseCorpo(UpdateOutraRemuneracaoSchema, req.body);
    const { scope, svc } = await resolve(b.unitId, 'write');
    return res.json({ success: true, data: await svc.updateOutraRemuneracao(scope, p.data.id, p.data.outraRemuneracaoId, b) });
  }),
  remove: handler(async (req, res, resolve) => {
    const p = parse(DpOutraRemuneracaoIdParamSchema, req.params, res);
    if (!p.ok) return;
    const q = parse(DpScopeQuerySchema, req.query, res);
    if (!q.ok) return;
    const { scope, svc } = await resolve(q.data.unitId, 'write');
    await svc.deleteOutraRemuneracao(scope, p.data.id, p.data.outraRemuneracaoId);
    return res.status(204).send();
  }),
};
