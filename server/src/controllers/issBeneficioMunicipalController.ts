import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  IssBeneficioMunicipalCreateDto,
  IssBeneficioMunicipalIdParamSchema,
  IssBeneficioMunicipalScopeQuerySchema,
} from '../features/accounting/dtos/IssBeneficioMunicipalDto';

/** SIMPLES-PISO-ANEXO-XI bloco 1 (BRIEF item 1) — GET/POST /api/accounting/iss-beneficios-municipais, GET/PUT/DELETE /:id. */
export const listIssBeneficiosMunicipais = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const query = IssBeneficioMunicipalScopeQuerySchema.safeParse(req.query);
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const data = await getFactory().getIssBeneficioMunicipalService().list(resolveAccountingScope(user, query.data.unitId));
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getIssBeneficioMunicipal = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = IssBeneficioMunicipalIdParamSchema.safeParse(req.params);
    const query = IssBeneficioMunicipalScopeQuerySchema.safeParse(req.query);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const data = await getFactory().getIssBeneficioMunicipalService().get(resolveAccountingScope(user, query.data.unitId), params.data.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const createIssBeneficioMunicipal = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const body = IssBeneficioMunicipalCreateDto.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const data = await getFactory().getIssBeneficioMunicipalService().create(resolveAccountingScope(user, body.data.unitId), body.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const updateIssBeneficioMunicipal = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = IssBeneficioMunicipalIdParamSchema.safeParse(req.params);
    const body = IssBeneficioMunicipalCreateDto.safeParse(req.body);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const data = await getFactory().getIssBeneficioMunicipalService().update(resolveAccountingScope(user, body.data.unitId), params.data.id, body.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const deleteIssBeneficioMunicipal = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const params = IssBeneficioMunicipalIdParamSchema.safeParse(req.params);
    const query = IssBeneficioMunicipalScopeQuerySchema.safeParse(req.query);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    await getFactory().getIssBeneficioMunicipalService().delete(resolveAccountingScope(user, query.data.unitId), params.data.id);
    return res.json({ success: true });
  } catch (error) {
    return handleApiError(error, res);
  }
};
