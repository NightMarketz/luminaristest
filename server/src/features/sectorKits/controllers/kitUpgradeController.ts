import type { Request, Response } from 'express';
import { z } from 'zod';
import { handleApiError } from '../../../lib/apiUtils';
import { getUserContextFromRequest } from '../../../lib/authUtils';
import { resolveBindingScope, type BindingScope } from '../../accountingBinding/models/bindingScope';
import {
  DecideKitPendingRequestSchema,
  KitInstallationViewSchema,
  KitUpgradePendingViewSchema,
  ListKitPendingQuerySchema,
} from '../dtos/KitUpgradeDto';
import { RoleOverrideScopeQuerySchema } from '../dtos/RoleAccountOverrideDto';
import type { KitPendingService } from '../services/KitPendingService';
import type { KitUpgradeService } from '../services/KitUpgradeService';

/**
 * Atualização do kit (BE-INCR-KIT-SETOR, PR-4, itens 37–38) — handlers de `/api/accounting-kit`:
 *
 *   GET  /accounting-kit?unitId=                      → instalação, última execução, pendências abertas, changelog
 *   GET  /accounting-kit/pending?unitId=&status=      → pendências (nível c)
 *   POST /accounting-kit/pending/:id/accept           → aplica o valor do kit (`{unitId, motivo}`)
 *   POST /accounting-kit/pending/:id/reject           → mantém o valor do tenant (`{unitId, motivo}`)
 *
 * A atualização em si não tem rota: roda pelo `upgradeSectorKitsCli`, no passo de migração do deploy (item 34).
 */
export interface KitUpgradeControllerDeps {
  buildUpgradeService: (scope: BindingScope) => KitUpgradeService;
  buildPendingService: (scope: BindingScope) => KitPendingService;
}

const PendingIdSchema = z.string().min(1);

export function createKitUpgradeController(deps: KitUpgradeControllerDeps) {
  const { buildUpgradeService, buildPendingService } = deps;

  const getKit = async (req: Request, res: Response) => {
    try {
      const user = getUserContextFromRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const parsed = RoleOverrideScopeQuerySchema.safeParse(req.query);
      if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
      const scope = resolveBindingScope(user, parsed.data.unitId);
      const data = await buildUpgradeService(scope).view(scope);
      return res.json({ success: true, data: KitInstallationViewSchema.nullable().parse(data) });
    } catch (error) {
      return handleApiError(error, res);
    }
  };

  const listPending = async (req: Request, res: Response) => {
    try {
      const user = getUserContextFromRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const parsed = ListKitPendingQuerySchema.safeParse(req.query);
      if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
      const scope = resolveBindingScope(user, parsed.data.unitId);
      const data = await buildPendingService(scope).list(scope, parsed.data.status);
      return res.json({ success: true, data: KitUpgradePendingViewSchema.array().parse(data) });
    } catch (error) {
      return handleApiError(error, res);
    }
  };

  const decide = (action: 'accept' | 'reject') => async (req: Request, res: Response) => {
    try {
      const user = getUserContextFromRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const id = PendingIdSchema.safeParse(req.params.id);
      const body = DecideKitPendingRequestSchema.safeParse(req.body);
      if (!id.success) return res.status(400).json({ success: false, error: id.error.flatten() });
      if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
      const scope = resolveBindingScope(user, body.data.unitId);
      const service = buildPendingService(scope);
      const data = action === 'accept' ? await service.accept(scope, id.data, body.data) : await service.reject(scope, id.data, body.data);
      return res.json({ success: true, data: KitUpgradePendingViewSchema.parse(data) });
    } catch (error) {
      return handleApiError(error, res);
    }
  };

  return { getKit, listPending, acceptPending: decide('accept'), rejectPending: decide('reject') };
}
