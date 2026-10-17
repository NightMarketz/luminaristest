/**
 * Ledger de versões das DynamicTables (BE-INCR-DT-VERSION-LEDGER, D-2026-10-17) — 7 handlers:
 * linha (lista, detalhe, diff, restore) e schema (lista, detalhe, diff — L3).
 */
import type { Request, Response } from 'express';
import { getFactory } from '@/lib/factory';
import { handleApiError } from '@/lib/apiUtils';
import { getUserContextFromRequest } from '@/lib/authUtils';
import {
  ListVersionsQueryDto,
  RowVersionNumberParamsDto,
  RowVersionParamsDto,
  SchemaVersionNumberParamsDto,
  SchemaVersionParamsDto,
  VersionDiffQueryDto,
} from '@/features/dynamicTables/dtos/DynamicTableVersion.dto';
import { maybeSyncSaleFinalized } from '@/features/accounting/sync/bridges/SaleSalesAccountingBridge';
import { maybeSyncSalePackageSold } from '@/features/accounting/sync/bridges/SalePackageSoldBridge';

function noStore(res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
}

export async function listRowVersions(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const params = RowVersionParamsDto.safeParse(req.params);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    const query = ListVersionsQueryDto.safeParse(req.query);
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const result = await getFactory().getDynamicTableVersionService()
      .listRowVersions(ctx, params.data.tableId, params.data.dataId, query.data);
    noStore(res);
    return res.json({ success: true, ...result });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function getRowVersion(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const params = RowVersionNumberParamsDto.safeParse(req.params);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    const { tableId, dataId, version } = params.data;
    const data = await getFactory().getDynamicTableVersionService().getRowVersion(ctx, tableId, dataId, version);
    noStore(res);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function diffRowVersion(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const params = RowVersionNumberParamsDto.safeParse(req.params);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    const query = VersionDiffQueryDto.safeParse(req.query);
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const { tableId, dataId, version } = params.data;
    const data = await getFactory().getDynamicTableVersionService()
      .diffRowVersion(ctx, tableId, dataId, version, query.data.against);
    noStore(res);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

/**
 * Item 14. L5 (dono, 2026-10-17): depois do commit, as mesmas pontes contábeis do PUT de linha
 * (`dynamicTablesController.updateTableData`) — restaurar uma venda contabiliza como editá-la (§2.1: fora do motor).
 */
export async function restoreRowVersion(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const params = RowVersionNumberParamsDto.safeParse(req.params);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    const { tableId, dataId, version } = params.data;
    const updated = await getFactory().getDynamicTableVersionService().restoreRowVersion(ctx, tableId, dataId, version);
    await maybeSyncSaleFinalized(ctx, tableId, updated);
    await maybeSyncSalePackageSold(ctx, tableId, updated);
    return res.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function listSchemaVersions(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const params = SchemaVersionParamsDto.safeParse(req.params);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    const query = ListVersionsQueryDto.safeParse(req.query);
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const result = await getFactory().getDynamicTableVersionService().listSchemaVersions(ctx, params.data.tableId, query.data);
    noStore(res);
    return res.json({ success: true, ...result });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function getSchemaVersion(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const params = SchemaVersionNumberParamsDto.safeParse(req.params);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    const data = await getFactory().getDynamicTableVersionService().getSchemaVersion(ctx, params.data.tableId, params.data.version);
    noStore(res);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}

export async function diffSchemaVersion(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) return res.status(401).json({ success: false, error: 'Authentication required' });
    const params = SchemaVersionNumberParamsDto.safeParse(req.params);
    if (!params.success) return res.status(400).json({ success: false, error: params.error.flatten() });
    const query = VersionDiffQueryDto.safeParse(req.query);
    if (!query.success) return res.status(400).json({ success: false, error: query.error.flatten() });
    const data = await getFactory().getDynamicTableVersionService()
      .diffSchemaVersion(ctx, params.data.tableId, params.data.version, query.data.against);
    noStore(res);
    return res.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, res);
  }
}
