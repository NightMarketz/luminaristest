/**
 * OpenAPI de /api/saved-views.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   # ─── DASHBOARD LAYOUT: documented inline in controllers/dashboardLayoutController.ts ───
 *   # ─── SAVED VIEWS ────────────────────────────────────────────────────────
 *   /api/saved-views:
 *     get:
 *       summary: List the current user's saved views for a table
 *       tags: [SavedViews]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: query
 *           name: tableId
 *           required: true
 *           schema: { type: string }
 *       responses:
 *         '200': { description: Array of saved views }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *     post:
 *       summary: Create a saved view
 *       tags: [SavedViews]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CreateSavedTableView' }
 *       responses:
 *         '201': { description: Saved view created }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/saved-views/{id}:
 *     patch:
 *       summary: Update a saved view
 *       tags: [SavedViews]
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
 *             schema: { $ref: '#/components/schemas/UpdateSavedTableView' }
 *       responses:
 *         '200': { description: Updated saved view }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     delete:
 *       summary: Delete a saved view (soft-delete)
 *       tags: [SavedViews]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string, format: cuid }
 *       responses:
 *         '200': { description: Saved view deleted }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
