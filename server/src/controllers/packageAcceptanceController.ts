import { Request, Response } from 'express';
import { getUserContextFromRequest } from '../lib/authUtils';
import { handleApiError } from '../lib/apiUtils';
import { UnauthorizedError } from '../lib/errors';
import { getFactory } from '../lib/factory';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  CreatePackageAcceptanceSchema,
  GetPackageAcceptanceQuerySchema,
  PackageSaleReceiptQuerySchema,
  ValidityNoticeQuerySchema,
} from '../features/packages/dtos/PackageAcceptanceDto';

/**
 * Package-validity acceptance (FE-INCR-PACOTE-VALIDADE, F-JUR-4). No update/delete route exists on purpose: the row is
 * proof, not a record to maintain. Docs (`@openapi`) live in routes/docs.paths.ts, like the sibling package-balances.
 */

export const getValidityNotice = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) throw new UnauthorizedError();
    const parsed = ValidityNoticeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const notice = await getFactory().getPackageAcceptanceService().getNotice(scope, parsed.data);
    return res.json({ success: true, data: notice });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const createPackageAcceptance = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) throw new UnauthorizedError();
    const parsed = CreatePackageAcceptanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const acceptance = await getFactory().getPackageAcceptanceService().create(scope, parsed.data);
    return res.status(201).json({ success: true, data: acceptance });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getPackageAcceptance = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) throw new UnauthorizedError();
    const parsed = GetPackageAcceptanceQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const acceptance = await getFactory().getPackageAcceptanceService().getBySale(scope, parsed.data.saleId);
    return res.json({ success: true, data: acceptance });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getPackageSaleReceipt = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) throw new UnauthorizedError();
    const parsed = PackageSaleReceiptQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const { buffer, fileName, mimeType } = await getFactory()
      .getPackageAcceptanceService()
      .generateReceipt(scope, req.params.saleId);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    return res.send(buffer);
  } catch (error) {
    return handleApiError(error, res);
  }
};
