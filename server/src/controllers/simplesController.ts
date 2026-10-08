import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  CompetenciaParamSchema,
  SalaoParceriaContratoPatchSchema,
  SalaoParceriaContratoSchema,
  SimplesHistoricoUpsertSchema,
  SimplesIdParamSchema,
  SimplesSegregacaoUpsertSchema,
  SimplesUnitQuerySchema,
} from '../features/accounting/dtos/SimplesDto';

/**
 * BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14, itens 10–13) — borda HTTP fina: auth → Zod safeParse → escopo → service →
 * handleApiError.
 */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });
const service = () => getFactory().getSimplesEntradasService();

/** PUT /api/accounting/simples/historico/:competencia */
export const putSimplesHistorico = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompetenciaParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = SimplesHistoricoUpsertSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await service().upsertHistorico(resolveAccountingScope(user, b.data.unitId), p.data.competencia, b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** PUT /api/accounting/simples/segregacao/:competencia */
export const putSimplesSegregacao = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompetenciaParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = SimplesSegregacaoUpsertSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await service().upsertSegregacao(resolveAccountingScope(user, b.data.unitId), p.data.competencia, b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/simples/parcerias */
export const createParceria = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const b = SalaoParceriaContratoSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await service().createParceria(resolveAccountingScope(user, b.data.unitId), b.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/simples/parcerias?unitId= */
export const listParcerias = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const q = SimplesUnitQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await service().listParcerias(resolveAccountingScope(user, q.data.unitId));
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** PATCH /api/accounting/simples/parcerias/:id */
export const updateParceria = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = SimplesIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = SalaoParceriaContratoPatchSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await service().updateParceria(resolveAccountingScope(user, b.data.unitId), p.data.id, b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** DELETE /api/accounting/simples/parcerias/:id?unitId= — soft-delete. */
export const deleteParceria = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = SimplesIdParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = SimplesUnitQuerySchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    await service().deleteParceria(resolveAccountingScope(user, q.data.unitId), p.data.id);
    return res.status(204).send();
  } catch (error) {
    return handleApiError(error, res);
  }
};
