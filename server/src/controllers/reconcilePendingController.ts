import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import {
  ListReconcilePendingQueryDto,
  RescanReconcilePendingDto,
} from '../features/accounting/dtos/ReconcilePendingDto';

/**
 * BE-INCR-RECONCILE-PENDING (nó C7) HTTP edge — Fork 3-b. Thin controllers: auth → Zod safeParse
 * → resolve scope → delegate to ReconcilePendingService → handleApiError. Mirrors
 * payableController.ts.
 */

/** GET /api/reconcile-pending?unitId=&reasonCode=&includeResolved=&cursor=&limit= */
export const listReconcilePending = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const parsed = ListReconcilePendingQueryDto.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getReconcilePendingService().list(scope, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/reconcile-pending/rescan — re-drive unresolved pending items (Fork 3-b, item 6). */
export const rescanReconcilePending = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const parsed = RescanReconcilePendingDto.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getReconcilePendingService().rescan(scope, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
