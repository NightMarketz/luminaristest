import { Request, Response } from 'express';
import { getUserContextFromRequest } from '../lib/authUtils';
import { handleApiError } from '../lib/apiUtils';
import { UnauthorizedError } from '../lib/errors';
import { getFactory } from '../lib/factory';
import { CancelSaleSchema, ReturnSaleSchema } from '../features/sales/dtos/SalesCancellationDto';
import { RegisterPaymentSchema } from '../features/sales/dtos/RegisterPaymentDto';
import { FiscalCheckBodySchema, FiscalCheckParamsSchema } from '../features/sales/dtos/FiscalCheckDto';

/** POST /api/sales/cancel — transition a finalized sale to Cancelled (estorno of revenue). */
export const cancelSale = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) throw new UnauthorizedError();
    const parsed = CancelSaleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const data = await getFactory().getSalesCancellationService().cancel(user, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/sales/return — transition a finalized sale to Returned (contra-revenue entry). */
export const returnSale = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) throw new UnauthorizedError();
    const parsed = ReturnSaleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const data = await getFactory().getSalesCancellationService().return_(user, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/sales/pay — register payment for a finalized sale (settlement: baixa de A Receber). */
export const registerPayment = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) throw new UnauthorizedError();
    const parsed = RegisterPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const data = await getFactory().getRegisterPaymentService().registerPayment(user, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * POST /api/sales/:id/fiscal-check — guarda fiscal da venda (EFICIENCIA-FISCAL PR-1 item 6): piso, alocação do desconto e
 * invariantes I-1..I-4. Escopo = a unidade da própria venda; régua `canManageFiscalProfile` (BRIEF §4.3).
 */
export const fiscalCheck = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) throw new UnauthorizedError();
    const params = FiscalCheckParamsSchema.safeParse(req.params);
    const body = FiscalCheckBodySchema.safeParse(req.body ?? {});
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const guard = getFactory().getSaleFiscalGuardService();
    const unitId = await guard.unitIdOfSale(user.userId, params.data.id);
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, unitId, { access: 'write' });
    const data = await guard.checkSale(scope, params.data.id);
    // Centavos em string: não há serialização global de BigInt (o schema de resposta os coage de volta).
    return res.json({ success: true, data: JSON.parse(JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))) });
  } catch (error) {
    return handleApiError(error, res);
  }
};
