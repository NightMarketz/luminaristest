import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { PutNfceContingenciaSchema } from '../features/accounting/dtos/NfceContingenciaDto';

/**
 * Contingência off-line da NFC-e por unidade e ambiente (X10a PR-9; D-2026-10-29-X10A-PR7-9-FORKS decisões 4 e 8) — borda
 * HTTP fina: auth → Zod → escopo → service → handleApiError.
 */
const bad = (res: Response, error: unknown) => res.status(400).json({ success: false, error });

/** PUT /api/accounting/nfce-contingencia/:unitId — o operador liga (com xJust) ou desliga a contingência do ambiente. */
export const putNfceContingencia = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const parsed = PutNfceContingenciaSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.flatten());
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, req.params.unitId, { access: 'write' });
    return res.json({ success: true, data: await getFactory().getNfceContingenciaService().definir(scope, parsed.data) });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/** GET /api/accounting/nfce-contingencia/:unitId — o estado da contingência nos dois ambientes. */
export const getNfceContingencia = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const scope = await getFactory().getAccountingScopeResolver().resolve(user, req.params.unitId, { access: 'read' });
    return res.json({ success: true, data: await getFactory().getNfceContingenciaService().listar(scope) });
  } catch (error) {
    return handleApiError(error, res);
  }
};
