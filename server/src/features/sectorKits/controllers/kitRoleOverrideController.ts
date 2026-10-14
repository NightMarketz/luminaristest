import type { Request, Response } from 'express';
import { handleApiError } from '../../../lib/apiUtils';
import { getUserContextFromRequest } from '../../../lib/authUtils';
import { resolveBindingScope, type BindingScope } from '../../accountingBinding/scope/BindingScope';
import {
  RemoveRoleOverrideResultSchema,
  RoleAccountOverrideViewSchema,
  RoleOverrideRoleParamSchema,
  RoleOverrideScopeQuerySchema,
  SetRoleOverrideRequestSchema,
  SetRoleOverrideResultSchema,
} from '../dtos/RoleAccountOverrideDto';
import type { RoleAccountOverrideService } from '../services/RoleAccountOverrideService';

/**
 * Ajuste papel→conta do kit (BE-INCR-KIT-SETOR, PR-3, item 22) — handlers de `/api/accounting-kit/role-overrides`:
 *
 *   GET    /accounting-kit/role-overrides?unitId=        → ajustes vivos da unidade
 *   PUT    /accounting-kit/role-overrides/:role          → grava o ajuste e recompila (`{unitId, accountId, motivo}`)
 *   DELETE /accounting-kit/role-overrides/:role?unitId=  → remove e recompila de volta ao código do kit
 *
 * Mesma fábrica-por-escopo do `accountingBindingController`: as portas fecham sobre o escopo do request.
 */
export interface KitRoleOverrideControllerDeps {
  buildService: (scope: BindingScope) => RoleAccountOverrideService;
}

export function createKitRoleOverrideController(deps: KitRoleOverrideControllerDeps) {
  const { buildService } = deps;

  const listRoleOverrides = async (req: Request, res: Response) => {
    try {
      const user = getUserContextFromRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const parsed = RoleOverrideScopeQuerySchema.safeParse(req.query);
      if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
      const scope = resolveBindingScope(user, parsed.data.unitId);
      const data = await buildService(scope).list(scope);
      return res.json({ success: true, data: RoleAccountOverrideViewSchema.array().parse(data) });
    } catch (error) {
      return handleApiError(error, res);
    }
  };

  const setRoleOverride = async (req: Request, res: Response) => {
    try {
      const user = getUserContextFromRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const role = RoleOverrideRoleParamSchema.safeParse(req.params.role);
      const body = SetRoleOverrideRequestSchema.safeParse(req.body);
      if (!role.success) return res.status(400).json({ success: false, error: role.error.flatten() });
      if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
      const scope = resolveBindingScope(user, body.data.unitId);
      const data = await buildService(scope).set(scope, role.data, body.data);
      return res.json({ success: true, data: SetRoleOverrideResultSchema.parse(data) });
    } catch (error) {
      return handleApiError(error, res);
    }
  };

  const removeRoleOverride = async (req: Request, res: Response) => {
    try {
      const user = getUserContextFromRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const role = RoleOverrideRoleParamSchema.safeParse(req.params.role);
      const query = RoleOverrideScopeQuerySchema.safeParse(req.query);
      if (!role.success) return res.status(400).json({ success: false, error: role.error.flatten() });
      if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
      const scope = resolveBindingScope(user, query.data.unitId);
      const data = await buildService(scope).remove(scope, role.data);
      return res.json({ success: true, data: RemoveRoleOverrideResultSchema.parse(data) });
    } catch (error) {
      return handleApiError(error, res);
    }
  };

  return { listRoleOverrides, setRoleOverride, removeRoleOverride };
}
