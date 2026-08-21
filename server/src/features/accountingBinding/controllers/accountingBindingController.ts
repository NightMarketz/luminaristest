import type { Request, Response } from 'express';
import { handleApiError } from '../../../lib/apiUtils';
import { getUserContextFromRequest } from '../../../lib/authUtils';
import { resolveBindingScope } from '../repositories/IAccountingBindingRepository';
import type { BindingScope } from '../repositories/IAccountingBindingRepository';
import {
  CompileBindingRequestSchema,
  ListBindingsQuerySchema,
  ValidateBindingRequestSchema,
} from '../dtos/CompileBindingDto';
import type { BindingCompileService } from '../services/BindingCompileService';

/**
 * A Prensa (BE-INCR-BINDING-PRESS, Fase P1) — handlers das 3 rotas do módulo (Corpo C, item 15
 * do BRIEF, metade "SEM registro" — a fiação em `lib/factory.ts` + o registro em
 * `routes/accounting-binding.ts`/`docs.paths.ts` é da Fase B, F-BP-1(b)):
 *
 *   POST /accounting-binding/compile   → compila e persiste (auto-ativa OU Draft, F-BP-2b)
 *   POST /accounting-binding/validate  → roda o validador SEM persistir
 *   GET  /accounting-binding           → lista os bindings do escopo
 *
 * Não há rota `activate` separada (F-BP-2b: a ativação é efeito do compile).
 *
 * DESENHO DE INJEÇÃO: uma FÁBRICA de handlers, não `getFactory().getX()` direto no corpo de cada
 * handler (padrão que o resto de `src/controllers/*.ts` usa). `deps.buildCompileService(scope)`
 * — uma FÁBRICA por escopo, não uma instância fixa — é o ponto de injeção (ACHADO da fiação real,
 * Fase B, item 15: `ChartLookupPort.findLeafAccountByCode(code)` — a porta que o validador do
 * Corpo B consome, `models/types.ts` — não recebe `scope` por parâmetro; o plano de contas é
 * escopado por tenant (`AccountRepository.findByCode(scope, code)`), então o adaptador concreto só
 * pode fechar sobre o escopo DEPOIS que o handler o resolve do request, não uma vez só no boot do
 * processo. `BindingCompileService`/`BindingValidationService` continuam stateless entre chamadas —
 * `buildCompileService` é barato (monta 2 objetos) e cada handler chama uma vez, já com `scope` em
 * mãos.
 */
export interface AccountingBindingControllerDeps {
  buildCompileService: (scope: BindingScope) => BindingCompileService;
}

export function createAccountingBindingController(deps: AccountingBindingControllerDeps) {
  const { buildCompileService } = deps;

  /** POST /accounting-binding/compile */
  const compileBinding = async (req: Request, res: Response) => {
    try {
      const user = getUserContextFromRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const parsed = CompileBindingRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.flatten() });
      }
      const scope = resolveBindingScope(user, parsed.data.unitId);
      const result = await buildCompileService(scope).compile(scope, {
        sectorKey: parsed.data.sectorKey,
        operationalSchema: parsed.data.operationalSchema,
        chart: parsed.data.chart,
        eventBindings: parsed.data.eventBindings,
      });
      return res.json({ success: true, data: result });
    } catch (error) {
      return handleApiError(error, res);
    }
  };

  /** POST /accounting-binding/validate — mesmo corpo de `/compile`, não persiste. */
  const validateBinding = async (req: Request, res: Response) => {
    try {
      const user = getUserContextFromRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const parsed = ValidateBindingRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.flatten() });
      }
      const scope = resolveBindingScope(user, parsed.data.unitId);
      const result = await buildCompileService(scope).validateOnly(scope, {
        sectorKey: parsed.data.sectorKey,
        operationalSchema: parsed.data.operationalSchema,
        chart: parsed.data.chart,
        eventBindings: parsed.data.eventBindings,
      });
      return res.json({ success: true, data: result });
    } catch (error) {
      return handleApiError(error, res);
    }
  };

  /** GET /accounting-binding?unitId&sectorKey&status */
  const listBindings = async (req: Request, res: Response) => {
    try {
      const user = getUserContextFromRequest(req);
      if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const parsed = ListBindingsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.flatten() });
      }
      const scope = resolveBindingScope(user, parsed.data.unitId);
      const data = await buildCompileService(scope).list(scope, {
        sectorKey: parsed.data.sectorKey,
        status: parsed.data.status,
      });
      return res.json({ success: true, data });
    } catch (error) {
      return handleApiError(error, res);
    }
  };

  return { compileBinding, validateBinding, listBindings };
}
