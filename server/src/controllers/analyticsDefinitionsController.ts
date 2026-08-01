import type { Request, Response } from 'express';
import { handleApiError } from '@/lib/apiUtils';
import { getFactory } from '@/lib/factory';
import { getUserContextFromRequest } from '@/lib/authUtils';
import type { IDynamicTable } from '@/features/dynamicTables/models/DynamicTable.model';
import type { UserContext } from '@/lib/authUtils';
import {
  CreateAnalyticsDefinitionSchema,
  UpdateAnalyticsDefinitionSchema,
} from '@/features/analytics/dtos/AnalyticsDefinitionDto';

async function getCoreTableId(user: UserContext) {
  const service = getFactory().getDynamicTableService();
  const tables = await service.getTablesForUser(user.id);
  const core = tables.find((t: IDynamicTable) => t.internalName === 'analyticsDefinitions' || t.name === 'Analytics Definitions');
  return core?.id || null;
}

export async function listAnalyticsDefinitions(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });

    const tableId = await getCoreTableId(ctx);
    if (!tableId) return res.status(200).json({ success: true, data: [] });

    const service = getFactory().getDynamicTableService();
    const rows = await service.getAllTableData(ctx, tableId);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function createAnalyticsDefinition(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });

    // Parse BEFORE the table lookup: a malformed body is a boundary problem and must not depend on
    // whether the CORE table exists — otherwise both failures collapse into the same 400 and neither
    // the caller nor a test can tell them apart.
    const parsed = CreateAnalyticsDefinitionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });

    const tableId = await getCoreTableId(ctx);
    if (!tableId) return res.status(400).json({ success: false, error: 'CORE analyticsDefinitions table not found' });

    const service = getFactory().getDynamicTableService();
    const created = await service.createTableData(ctx, tableId, { data: parsed.data });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function updateAnalyticsDefinition(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });

    const parsed = UpdateAnalyticsDefinitionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.flatten() });

    const tableId = await getCoreTableId(ctx);
    if (!tableId) return res.status(400).json({ success: false, error: 'CORE analyticsDefinitions table not found' });

    const id = String(req.params.id || '');
    const service = getFactory().getDynamicTableService();
    const updated = await service.updateTableData(ctx, id, { data: parsed.data });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function deleteAnalyticsDefinition(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });

    const tableId = await getCoreTableId(ctx);
    if (!tableId) return res.status(400).json({ success: false, error: 'CORE analyticsDefinitions table not found' });

    const id = String(req.params.id || '');
    const service = getFactory().getDynamicTableService();
    await service.deleteTableData(ctx, id);
    return res.status(200).json({ success: true, message: 'Definition deleted' });
  } catch (error) {
    return handleApiError(error, res);
  }
}


