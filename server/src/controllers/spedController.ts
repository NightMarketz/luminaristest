import type { Request, Response } from 'express';
import { getFactory } from '../lib/factory';
import { handleApiError } from '../lib/apiUtils';
import { getUserContextFromRequest } from '../lib/authUtils';
import { resolveAccountingScope } from '../features/accounting/scope/AccountingScope';
import { SpedEcdRequestSchema } from '../features/accounting/dtos/SpedEcdDto';
import { SpedEcfRequestSchema } from '../features/accounting/dtos/SpedEcfDto';
import { SpedEcfRealRequestSchema } from '../features/accounting/dtos/SpedEcfRealDto';

/**
 * POST /api/accounting/sped/ecd/generate — generate the SPED ECD (.txt) for a
 * year. Returns the export job summary; the artifact downloads via the existing
 * data-exchange job route (GET /data-exchange/jobs/:jobId/download). A coverage
 * gap surfaces as a 400 ValidationError with `unmappedAccounts` (D5).
 */
export const generateSpedEcd = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const parsed = SpedEcdRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getSpedGenerationService().generate(scope, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * POST /api/accounting/sped/ecf/generate — generate the SPED ECF (.txt) for a
 * year (Lucro Presumido MVP). Returns the export job summary; the artifact
 * downloads via the existing data-exchange job route. A Revenue account with
 * movement outside {3.1, 3.3} surfaces as a 400 ValidationError with
 * `unmappedRevenueAccounts` (D6 corrigido — gate de exaustividade da receita).
 */
export const generateSpedEcf = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const parsed = SpedEcfRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getSpedEcfGenerationService().generate(scope, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

/**
 * POST /api/accounting/sped/ecf/real/generate — generate the SPED ECF (.txt) for a
 * year in Lucro REAL (esqueleto, ADR-INCR-SPED-ECF-FASE3; Fork 1→(b) rota dedicada).
 * Returns the export job summary (kind EXPORT_SPED_ECF_REAL); the artifact downloads
 * via the existing data-exchange job route. `fiscal.formaTrib`/`formaTribPer` are
 * REQUIRED (no server default — the regime code is never guessed); Blocks L/M/N are
 * emitted as empty markers until Forks 2/3/4 are ratified. No revenue exhaustiveness
 * gate (the Real base is the whole income statement, BRIEF item 10).
 */
export const generateSpedEcfReal = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const parsed = SpedEcfRealRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const scope = resolveAccountingScope(user, parsed.data.unitId);
    const data = await getFactory().getSpedEcfRealGenerationService().generate(scope, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
