/**
 * OpenAPI de /api/reports.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   # ─── STRUCTURED DATA: documented inline in controllers/structuredDataController.ts ───
 *   # ─── REPORTS ────────────────────────────────────────────────────────────
 *   /api/reports/generate-chart-data:
 *     post:
 *       summary: Generate chart data via Server-Sent Events stream
 *       tags: [Reports]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { type: object }
 *       responses:
 *         '200':
 *           description: SSE stream of progress events and final chart data
 *           content:
 *             text/event-stream:
 *               schema:
 *                 type: string
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 */
export {};
