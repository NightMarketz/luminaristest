import { Request, Response } from 'express';
import { getUserContextFromRequest } from '../lib/authUtils';
import { handleApiError } from '../lib/apiUtils';
import { UnauthorizedError } from '../lib/errors';
import { getFactory } from '../lib/factory';
import { AvailabilityQuerySchema, FreeSlotsQuerySchema } from '../features/scheduling/dtos/availability';

/**
 * BE-INCR-ESCALA-BASE item 33 — leitura da escala: disponibilidade e horário livre. Só leitura; a escala é escrita pela
 * rota genérica do motor (tabelas `schedules`, `scheduleShifts`, `scheduleExceptions`). Docs em routes/docs/scheduling.paths.ts.
 */

export const getAvailability = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) throw new UnauthorizedError();
    const parsed = AvailabilityQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const data = await getFactory().getAvailabilityService().availability(user, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};

export const getFreeSlots = async (req: Request, res: Response) => {
  try {
    const user = getUserContextFromRequest(req);
    if (!user) throw new UnauthorizedError();
    const parsed = FreeSlotsQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });
    const data = await getFactory().getAvailabilityService().freeSlots(user, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
};
