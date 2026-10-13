import type { Request, Response } from 'express';
import { z } from 'zod';
import { handleApiError } from '@/lib/apiUtils';
import { getUserContextFromRequest } from '@/lib/authUtils';
import { UnauthorizedError } from '@/lib/errors';
import { getFactory } from '@/lib/factory';
import {
  CreateCrmReportSchema,
  RunCrmReportSchema,
  RunSavedCrmReportSchema,
  UpdateCrmReportSchema,
} from '@/features/crm/dtos/CrmReportDto';

/**
 * Builder de relatórios do CRM (BE-INCR-CRM-REPORT-BUILDER PR-2, item 10). Controller fino: auth → DTO Zod → serviço.
 * Corpo inválido → 400 com o `flatten()` do Zod (padrão de savedViewsController).
 */
const idSchema = z.string().cuid();

function requireUser(req: Request) {
  const user = getUserContextFromRequest(req);
  if (!user) throw new UnauthorizedError();
  return user;
}

const badId = (res: Response) => res.status(400).json({ success: false, error: 'Invalid report ID' });

export async function listCrmReports(req: Request, res: Response) {
  try {
    const user = requireUser(req);
    const data = await getFactory().getCrmReportService().list(user);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function getCrmReport(req: Request, res: Response) {
  try {
    const user = requireUser(req);
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return badId(res);
    const data = await getFactory().getCrmReportService().get(user, id.data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function createCrmReport(req: Request, res: Response) {
  try {
    const user = requireUser(req);
    const body = CreateCrmReportSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const data = await getFactory().getCrmReportService().create(user, body.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function updateCrmReport(req: Request, res: Response) {
  try {
    const user = requireUser(req);
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return badId(res);
    const body = UpdateCrmReportSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const data = await getFactory().getCrmReportService().update(user, id.data, body.data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function deleteCrmReport(req: Request, res: Response) {
  try {
    const user = requireUser(req);
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return badId(res);
    await getFactory().getCrmReportService().delete(user, id.data);
    return res.status(200).json({ success: true, data: { id: id.data } });
  } catch (error) {
    return handleApiError(error, res);
  }
}

/** Preview sem salvar (item 8). */
export async function runCrmReportPreview(req: Request, res: Response) {
  try {
    const user = requireUser(req);
    const body = RunCrmReportSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const data = await getFactory().getCrmReportService().runPreview(user, body.data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

/** Relatório salvo — também o widget `crmReport` do dashboard (item 12). */
export async function runSavedCrmReport(req: Request, res: Response) {
  try {
    const user = requireUser(req);
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return badId(res);
    const body = RunSavedCrmReportSchema.safeParse(req.body ?? {});
    if (!body.success) return res.status(400).json({ success: false, error: body.error.flatten() });
    const data = await getFactory().getCrmReportService().runSaved(user, id.data, body.data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}
