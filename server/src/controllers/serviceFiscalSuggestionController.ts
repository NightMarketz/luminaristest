import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveBindingScope } from '../features/accountingBinding/scope/BindingScope';
import {
  ServiceFiscalSuggestionPreviewSchema,
  ServiceFiscalSuggestionsQuerySchema,
} from '../features/sectorKits/dtos/ServiceFiscalSuggestionDto';

/**
 * Sugestão fiscal por serviço (BE-INCR-KIT-SETOR-EMENDA-1 PR-K3, 7e/7f) — borda HTTP fina: auth → Zod safeParse →
 * escopo → service → handleApiError. Só leitura; aceitar a sugestão é o PUT do perfil fiscal do serviço (7d).
 */

/** GET /api/service-fiscal-suggestions?unitId=&ia=1 — serviços sem perfil fiscal na unidade, com a sugestão de cada um. */
export const listServiceFiscalSuggestions = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ServiceFiscalSuggestionsQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveBindingScope(user, parsed.data.unitId);
    const data = await getFactory().getServiceFiscalSuggestionService(scope).pendentes(scope, { ia: parsed.data.ia === '1' });
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/service-fiscal-suggestions/preview — sugestão para um nome, no formulário de serviço. */
export const previewServiceFiscalSuggestion = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = ServiceFiscalSuggestionPreviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const scope = resolveBindingScope(user, parsed.data.unitId);
    const data = await getFactory().getServiceFiscalSuggestionService(scope).preview(scope, parsed.data.nome);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
