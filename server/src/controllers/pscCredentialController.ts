import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import {
  AuthorizePscSchema,
  CreatePscProviderSchema,
  PscCallbackQuerySchema,
  UpdatePscProviderSchema,
} from '../features/accounting/dtos/PscCredentialDto';

/**
 * Credencial do PSC por unidade e cadastro dos PSCs (X10a PR-7; EMENDA-PSC E-2..E-5) — borda HTTP fina: auth → Zod →
 * escopo → service → handleApiError. Nenhuma resposta carrega token, segredo OAuth nem code_verifier.
 */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

function actorOf(req: Request): { userId: string; role: string } | null {
  const user = getUserContextFromRequest(req);
  return user ? { userId: user.userId, role: String(user.role) } : null;
}

/** POST /api/accounting/psc-credentials/:unitId/authorize — devolve a URL de autorização do PSC. */
export const authorizePscCredential = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = AuthorizePscSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, req.params.unitId, { access: 'write' });
    return res.json({ success: true, data: await getFactory().getPscCredentialService().authorize(scope, parsed.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * GET /api/accounting/psc-credentials/callback — rota PÚBLICA (publicApiRoutes): quem chega é o navegador vindo do PSC.
 * A prova é o `state` assinado + a autorização pendente não expirada e não usada.
 */
export const pscCredentialCallback = async (req: Request, res: Response) => {
  try {
    const parsed = PscCallbackQuerySchema.safeParse(req.query);
    if (!parsed.success) return bad(res, parsed.error.flatten());
    return res.json({ success: true, data: await getFactory().getPscCredentialService().callback(parsed.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/psc-credentials/:unitId — só a view (com avisos). */
export const getPscCredential = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, req.params.unitId, { access: 'read' });
    return res.json({ success: true, data: await getFactory().getPscCredentialService().get(scope) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** DELETE /api/accounting/psc-credentials/:unitId — soft-delete com ciphertext zerado. */
export const deletePscCredential = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, req.params.unitId, { access: 'write' });
    await getFactory().getPscCredentialService().remove(scope);
    return res.status(204).end();
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/psc-providers — só PLATFORM_ADMIN. */
export const listPscProviders = async (req: Request, res: Response) => {
  try {
    const actor = actorOf(req);
    if (!actor) return res.status(401).json({ success: false, error: 'Unauthorized' });
    return res.json({ success: true, data: await getFactory().getPscProviderService().list(actor) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** POST /api/accounting/psc-providers — só PLATFORM_ADMIN. */
export const createPscProvider = async (req: Request, res: Response) => {
  try {
    const actor = actorOf(req);
    if (!actor) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = CreatePscProviderSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.flatten());
    return res.status(201).json({ success: true, data: await getFactory().getPscProviderService().create(actor, parsed.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** PATCH /api/accounting/psc-providers/:id — só PLATFORM_ADMIN. */
export const updatePscProvider = async (req: Request, res: Response) => {
  try {
    const actor = actorOf(req);
    if (!actor) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = UpdatePscProviderSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.flatten());
    return res.json({ success: true, data: await getFactory().getPscProviderService().update(actor, req.params.id, parsed.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** DELETE /api/accounting/psc-providers/:id — soft-delete, só PLATFORM_ADMIN. */
export const deletePscProvider = async (req: Request, res: Response) => {
  try {
    const actor = actorOf(req);
    if (!actor) return res.status(401).json({ success: false, error: 'Unauthorized' });
    await getFactory().getPscProviderService().remove(actor, req.params.id);
    return res.status(204).end();
  } catch (error) {
    return handleApiError(error, res);
  }
};
