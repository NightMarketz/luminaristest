import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  AccountingDeliveryScopeQuerySchema,
  BuildDeliveryPackageSchema,
  ConfirmDeliverySchema,
  RetryDeliverySchema,
} from '../features/accounting/dtos/AccountingDeliveryDto';

/**
 * Entrega do pacote ECD/ECF ao contador (BE-INCR-CONTADOR-DELIVERY) — borda HTTP. Nenhum destes
 * endpoints ENVIA coisa alguma: sob F-CD1-a o servidor não tem canal nem credencial. `build`
 * prepara e valida; `confirm` registra que o operador despachou.
 */

/** POST /api/accounting/delivery/build — preflight: valida jobs + gate dos 12 meses, não persiste. */
export const buildDeliveryPackage = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = BuildDeliveryPackageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getAccountingDeliveryService().buildDeliveryPackage(scope, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/delivery/confirm — registra a entrega (D6: `confirmed: true` explícito). */
export const confirmDelivery = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ConfirmDeliverySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getAccountingDeliveryService().confirmDelivery(scope, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * POST /api/accounting/delivery/:id/retry — FAILED → QUEUED sobre a linha existente.
 * `deliveryId` do corpo tem de bater com o `:id` do path (mesma regra do PATCH de contato).
 */
export const retryDelivery = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = RetryDeliverySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    if (parsed.data.deliveryId !== req.params.id) {
      return res.status(400).json({
        success: false,
        error: `deliveryId do corpo ('${parsed.data.deliveryId}') diverge do :id da rota ('${req.params.id}').`,
      });
    }
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory()
      .getAccountingDeliveryService()
      .retryDelivery(scope, req.params.id, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/delivery/:id?unitId= — o log de uma entrega (escopado; cross-tenant → 404). */
export const getDelivery = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = AccountingDeliveryScopeQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getAccountingDeliveryService().getDelivery(scope, req.params.id);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
