import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  CompanyFiscalProfileAnoParamSchema,
  CompanyFiscalProfileCopyParamSchema,
  CompanyFiscalProfileScopeSchema,
  EcfTransmitidaSchema,
  UpsertCompanyFiscalProfileSchema,
} from '../features/accounting/dtos/CompanyFiscalProfileDto';

/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF itens 6/9; F-XP-2/3 a) — perfil fiscal da EMPRESA por ano.
 * `unitId` (query ou corpo) só resolve escopo/policy; a chave é (dono, ano) — instância = CNPJ raiz (R8).
 */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

export const getCompanyFiscalProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompanyFiscalProfileAnoParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = CompanyFiscalProfileScopeSchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getCompanyFiscalProfileService().get(resolveAccountingScope(user, q.data.unitId), p.data.ano);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, error: 'company_fiscal_profile_missing', message: `Perfil fiscal da empresa não cadastrado para ${p.data.ano}.` });
    }
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const upsertCompanyFiscalProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompanyFiscalProfileAnoParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = UpsertCompanyFiscalProfileSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory().getCompanyFiscalProfileService().upsert(resolveAccountingScope(user, b.data.unitId), p.data.ano, b.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const deleteCompanyFiscalProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompanyFiscalProfileAnoParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = CompanyFiscalProfileScopeSchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    await getFactory().getCompanyFiscalProfileService().remove(resolveAccountingScope(user, q.data.unitId), p.data.ano);
    return res.json({ success: true });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getCompanyObligations = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompanyFiscalProfileAnoParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const q = CompanyFiscalProfileScopeSchema.safeParse(req.query);
    if (!q.success) return bad(res, q.error.flatten());
    const data = await getFactory().getCompanyFiscalProfileService().obligations(resolveAccountingScope(user, q.data.unitId), p.data.ano);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const copyCompanyFiscalProfile = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompanyFiscalProfileCopyParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = CompanyFiscalProfileScopeSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory()
      .getCompanyFiscalProfileService()
      .copyFrom(resolveAccountingScope(user, b.data.unitId), p.data.ano, p.data.anoAnterior);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** PR-2 item 16 (F-XP-5 a) — POST /company-fiscal-profile/:ano/ecf-transmitida { unitId, recibo }. */
export const markEcfTransmitida = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p = CompanyFiscalProfileAnoParamSchema.safeParse(req.params);
    if (!p.success) return bad(res, p.error.flatten());
    const b = EcfTransmitidaSchema.safeParse(req.body);
    if (!b.success) return bad(res, b.error.flatten());
    const data = await getFactory()
      .getCompanyFiscalProfileService()
      .marcarEcfTransmitida(resolveAccountingScope(user, b.data.unitId), p.data.ano, b.data.recibo);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
