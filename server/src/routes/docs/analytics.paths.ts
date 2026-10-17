/**
 * OpenAPI de /api/analytics.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   # ─── ANALYTICS ──────────────────────────────────────────────────────────
 *   /api/analytics/presets:
 *     get:
 *       summary: List all analytics preset groups for the current user
 *       tags: [Analytics]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: query
 *           name: presetKey
 *           schema: { type: string }
 *           description: Filter by a specific preset key
 *       responses:
 *         '200': { description: Array of preset group objects }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/analytics/data:
 *     get:
 *       summary: Get resolved chart data for a given analytics key
 *       tags: [Analytics]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: query
 *           name: key
 *           required: true
 *           schema: { type: string }
 *           description: Analytics chart key
 *         - in: query
 *           name: tableId
 *           schema: { type: string, format: cuid }
 *           description: Optional target table ID override
 *       responses:
 *         '200':
 *           description: Resolved chart data
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean }
 *                   data: { type: object }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/analytics/drill-down:
 *     get:
 *       summary: Get drill-down row data for specific record IDs from a table
 *       tags: [Analytics]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: query
 *           name: tableId
 *           required: true
 *           schema: { type: string, format: cuid }
 *         - in: query
 *           name: recordIds
 *           required: true
 *           schema: { type: string }
 *           description: Comma-separated list of row IDs
 *         - in: query
 *           name: fields
 *           schema: { type: string }
 *           description: Comma-separated list of field names to return (all if omitted)
 *         - in: query
 *           name: page
 *           schema: { type: integer, default: 1 }
 *         - in: query
 *           name: limit
 *           schema: { type: integer, default: 20 }
 *       responses:
 *         '200': { description: Paginated drill-down rows }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/analytics/discover/{tableId}:
 *     get:
 *       summary: Auto-discover KPI suggestions for a dynamic table
 *       tags: [Analytics]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: tableId
 *           required: true
 *           schema: { type: string, format: cuid }
 *       responses:
 *         '200': { description: Suggested KPI groups }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/analytics/presets/{presetKey}:
 *     get:
 *       summary: Get analytics preset groups for a specific preset key
 *       tags: [Analytics]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: presetKey
 *           required: true
 *           schema: { type: string }
 *       responses:
 *         '200': { description: Preset analytics groups }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/analytics/presets/{presetKey}/data:
 *     get:
 *       summary: Get chart data scoped to a preset
 *       tags: [Analytics]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: presetKey
 *           required: true
 *           schema: { type: string }
 *         - in: query
 *           name: key
 *           required: true
 *           schema: { type: string }
 *       responses:
 *         '200': { description: Chart data }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/analytics/chart/{chartKey}/details:
 *     get:
 *       summary: Get paginated detail rows for a chart data point
 *       tags: [Analytics]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: chartKey
 *           required: true
 *           schema: { type: string }
 *         - in: query
 *           name: dataPointName
 *           schema: { type: string }
 *         - in: query
 *           name: page
 *           schema: { type: integer, default: 1 }
 *         - in: query
 *           name: limit
 *           schema: { type: integer, default: 50 }
 *         - in: query
 *           name: search
 *           schema: { type: string }
 *         - in: query
 *           name: sortBy
 *           schema: { type: string }
 *         - in: query
 *           name: sortOrder
 *           schema: { type: string, enum: [asc, desc], default: desc }
 *       responses:
 *         '200': { description: Paginated detail records }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *
 *   # ─── ANALYTICS DEFINITIONS ──────────────────────────────────────────────
 *   /api/analytics/definitions:
 *     get:
 *       summary: List persisted analytics definitions for the current user
 *       tags: [AnalyticsDefinitions]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200': { description: Array of analytics definition rows }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *     post:
 *       summary: Create a new analytics definition
 *       tags: [AnalyticsDefinitions]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { type: object }
 *       responses:
 *         '201': { description: Definition created }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/analytics/definitions/{id}:
 *     put:
 *       summary: Update an analytics definition
 *       tags: [AnalyticsDefinitions]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string, format: cuid }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { type: object }
 *       responses:
 *         '200': { description: Definition updated }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     delete:
 *       summary: Delete an analytics definition
 *       tags: [AnalyticsDefinitions]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string, format: cuid }
 *       responses:
 *         '200': { description: Definition deleted }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
