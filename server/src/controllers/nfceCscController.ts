import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { NfceCscAmbienteQuerySchema, PutNfceCscSchema } from '../features/accounting/dtos/NfceCscDto';

/**
 * CSC da NFC-e por unidade e ambiente (X10a PR-8; D-2026-10-29-X10A-PR7-9-FORKS decisão 3) — borda HTTP fina: auth → Zod
 * → escopo → service → handleApiError. Nenhuma resposta carrega o CSC.
 */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

/** PUT /api/accounting/nfce-cscs/:unitId — grava (ou troca) o CSC do ambiente. */
export const putNfceCsc = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = PutNfceCscSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, req.params.unitId, { access: 'write' });
    return res.json({ success: true, data: await getFactory().getNfceCscService().set(scope, parsed.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/nfce-cscs/:unitId — os CSCs vivos da unidade (só o identificador). */
export const listNfceCscs = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, req.params.unitId, { access: 'read' });
    return res.json({ success: true, data: await getFactory().getNfceCscService().list(scope) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** DELETE /api/accounting/nfce-cscs/:unitId?ambiente= — soft-delete com o ciphertext zerado. */
export const deleteNfceCsc = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = NfceCscAmbienteQuerySchema.safeParse(req.query);
    if (!parsed.success) return bad(res, parsed.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, req.params.unitId, { access: 'write' });
    await getFactory().getNfceCscService().remove(scope, parsed.data.ambiente);
    return res.status(204).end();
  } catch (error) {
    return handleApiError(error, res);
  }
};
