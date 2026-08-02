/**
 * Custom KPI Controller
 *
 * POST /api/analytics/custom-kpis
 *
 * Accepts an array of KPI definitions, validates them with Zod and against
 * the target table's actual column list, then executes them safely so that
 * one broken calculation never crashes the whole dashboard.
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { handleApiError } from '@/lib/apiUtils';
import { getUserContextFromRequest } from '@/lib/authUtils';
import { getFactory } from '@/lib/factory';
import {
  KpiDefinitionSchema,
  validateKpiDefinition,
  type ColumnDescriptor,
} from '@/features/analytics/schemas/KpiSchema';
import type { IDynamicTable } from '@/features/dynamicTables/models/DynamicTable.model';
import { executeCustomKpis } from '@/features/analytics/engine/CustomKpiExecutor';

// ---------------------------------------------------------------------------
// Request body schema
// ---------------------------------------------------------------------------

const CustomKpiRequestSchema = z.object({
  tableId: z.string().min(1, 'tableId is required'),
  kpis: z.array(KpiDefinitionSchema).min(1, 'At least one KPI definition is required'),
});

/**
 * Upper bound on rows loaded into memory for a single request.
 *
 * `getAllTableData` is an unbounded `findMany` shared by 15 call sites — capping it there
 * would silently truncate every analytics aggregate in the app. A bare `take` here would be
 * just as wrong: truncating the input of a `sum`/`avg` returns a plausible WRONG number.
 * So the guard refuses instead of truncating.
 *
 * ponytail: hard refusal above the cap; switch to `getTableDataStream` + incremental
 * accumulators if a real table ever exceeds it.
 */
const MAX_KPI_ROWS = 50_000;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/** @openapi
 * /api/analytics/custom-kpis:
 *   post:
 *     summary: Execute ad-hoc custom KPI definitions over a dynamic table
 *     description: >-
 *       Validates every KPI definition with Zod and against the target table's real column
 *       list, then executes them. A KPI whose calculation throws yields a null value plus an
 *       error string rather than failing the whole response. Refuses tables above 50000 rows
 *       instead of truncating, because a truncated sum or avg is a plausible wrong number.
 *     tags: [Analytics]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tableId, kpis]
 *             properties:
 *               tableId:
 *                 type: string
 *                 description: Dynamic table the KPIs are computed over
 *               kpis:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [name, tableId, measure, field]
 *                   properties:
 *                     name: { type: string, minLength: 1, maxLength: 100 }
 *                     tableId:
 *                       type: string
 *                       description: Must equal the top-level tableId
 *                     measure: { type: string, enum: [sum, avg, count, min, max] }
 *                     field: { type: string, minLength: 1 }
 *                     filters:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required: [field, operator]
 *                         properties:
 *                           field: { type: string, minLength: 1 }
 *                           operator: { type: string, enum: [eq, gt, lt, gte, lte, contains] }
 *                           value: {}
 *     responses:
 *       '200':
 *         description: One result per submitted KPI, in request order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       kpiName: { type: string }
 *                       value: { type: number, nullable: true }
 *                       error: { type: string, nullable: true }
 *       '400': { $ref: '#/components/responses/BadRequestError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 */
export async function executeCustomKpisHandler(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // -------------------------------------------------------------------
    // 1. Zod parse
    // -------------------------------------------------------------------
    const parseResult = CustomKpiRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.issues,
      });
    }

    const { tableId, kpis } = parseResult.data;

    // Every KpiDefinition carries its own `tableId`, but only the top-level one selects the
    // table. Accepting a per-KPI value and silently ignoring it makes a mismatched request
    // return numbers from the wrong table — reject instead.
    const mismatched = kpis.filter((k) => k.tableId !== tableId).map((k) => k.name);
    if (mismatched.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Every kpi.tableId must equal the top-level tableId',
        details: mismatched,
      });
    }

    // -------------------------------------------------------------------
    // 2. Fetch table and its schema columns
    // -------------------------------------------------------------------
    const service = getFactory().getDynamicTableService();
    let table: IDynamicTable | undefined;
    try {
      table = await service.getTableById(ctx, tableId);
    } catch {
      return res.status(404).json({ success: false, error: `Table not found: ${tableId}` });
    }

    if (!table) {
      return res.status(404).json({ success: false, error: `Table not found: ${tableId}` });
    }

    const columns: ColumnDescriptor[] = (table.schema?.fields ?? []) as unknown as ColumnDescriptor[];

    // -------------------------------------------------------------------
    // 3. Per-KPI field existence validation
    // -------------------------------------------------------------------
    const fieldErrors: Array<{ kpiName: string; errors: string[] }> = [];

    for (const kpi of kpis) {
      const result = validateKpiDefinition(kpi, columns);
      if (!result.valid) {
        fieldErrors.push({ kpiName: kpi.name, errors: result.errors });
      }
    }

    if (fieldErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'One or more KPI definitions reference fields that do not exist in the table schema',
        details: fieldErrors,
      });
    }

    // -------------------------------------------------------------------
    // 4. Fetch table data (bounded — see MAX_KPI_ROWS)
    // -------------------------------------------------------------------
    const { total } = await service.getTableData(ctx, tableId, 1, 1);
    if (total > MAX_KPI_ROWS) {
      return res.status(400).json({
        success: false,
        error: `Table has ${total} rows, above the ${MAX_KPI_ROWS}-row limit for custom KPI execution`,
      });
    }

    const rawRows = await service.getAllTableData(ctx, tableId);
    const rows = rawRows.map((r) => ({
      id: String(r.id),
      data: (r.data && typeof r.data === 'object' && !Array.isArray(r.data)
        ? r.data
        : {}) as Record<string, unknown>,
    }));

    // -------------------------------------------------------------------
    // 5. Safe execution pipeline
    //    Each KPI is individually try/caught inside executeCustomKpis so
    //    one broken calculation cannot crash the entire response.
    // -------------------------------------------------------------------
    const results = executeCustomKpis(kpis, rows);

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    return handleApiError(error, res);
  }
}
