/**
 * OpenAPI de /api/dynamic-tables.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   # ─── DYNAMIC TABLES ─────────────────────────────────────────────────────
 *   /api/dynamic-tables:
 *     get:
 *       summary: List all dynamic tables for the current user
 *       tags: [DynamicTables]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200': { description: Array of table definitions }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/dynamic-tables/lookup:
 *     post:
 *       summary: Resolve relation values across tables (batch lookup)
 *       tags: [DynamicTables]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { type: object }
 *       responses:
 *         '200': { description: Resolved relation values }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/dynamic-tables/sync-preset:
 *     post:
 *       summary: Additively evolve an installed table's schema from its preset (admin-only)
 *       description: >
 *         Computes the additive delta (new fields + new select options) between the
 *         preset module and the user's installed table identified by internalName, then
 *         applies it via the engine's revalidating schema update. Never removes/renames
 *         fields or options. Idempotent: a second call with no preset changes is a no-op.
 *         Requires ADMIN role.
 *       tags: [DynamicTables]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [internalName]
 *               properties:
 *                 internalName:
 *                   type: string
 *                   description: Stable preset key of the installed table (e.g. 'leads')
 *       responses:
 *         '200': { description: 'Applied delta { added, optionsAdded }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/dynamic-tables/install-table:
 *     post:
 *       summary: Install ONE new table from its preset into an already-installed tenant (admin-only)
 *       description: >
 *         Idempotently installs a single preset table (identified by internalName) for the
 *         current tenant. If the table already exists it is a no-op (created=false). Relation
 *         markers (@@PRESET_TABLE_KEY::x) are resolved to the user's REAL installed table ids;
 *         a missing dependency table yields 404. Requires ADMIN role.
 *       tags: [DynamicTables]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [internalName]
 *               properties:
 *                 internalName:
 *                   type: string
 *                   description: Stable preset key of the table to install (e.g. 'crmOpportunities')
 *       responses:
 *         '200': { description: 'Install result { tableId, created }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/dynamic-tables/{tableId}:
 *     get:
 *       summary: Get a dynamic table schema by ID
 *       tags: [DynamicTables]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: tableId
 *           required: true
 *           schema: { type: string, format: cuid }
 *       responses:
 *         '200': { description: Table definition with schema }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/dynamic-tables/{tableId}/data:
 *     get:
 *       summary: Get all data rows for a dynamic table
 *       tags: [DynamicTables]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: tableId
 *           required: true
 *           schema: { type: string, format: cuid }
 *       responses:
 *         '200': { description: Array of data rows }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     post:
 *       summary: Create a new data row in a dynamic table
 *       tags: [DynamicTables]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: tableId
 *           required: true
 *           schema: { type: string, format: cuid }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Arbitrary key-value pairs matching the table schema fields
 *       responses:
 *         '201': { description: Row created }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/dynamic-tables/{tableId}/data/{dataId}:
 *     put:
 *       summary: Update a data row in a dynamic table
 *       tags: [DynamicTables]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: tableId
 *           required: true
 *           schema: { type: string, format: cuid }
 *         - in: path
 *           name: dataId
 *           required: true
 *           schema: { type: string, format: cuid }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Fields to update – merges with existing row data
 *       responses:
 *         '200': { description: Row updated }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     delete:
 *       summary: Delete a data row from a dynamic table
 *       tags: [DynamicTables]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: tableId
 *           required: true
 *           schema: { type: string, format: cuid }
 *         - in: path
 *           name: dataId
 *           required: true
 *           schema: { type: string, format: cuid }
 *       responses:
 *         '204': { description: Row deleted }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/dynamic-tables/{tableId}/data/batch-delete:
 *     post:
 *       summary: Soft-delete multiple data rows in a dynamic table (atomic)
 *       description: >
 *         Deletes up to 200 rows in a single transaction. Every id must belong to
 *         the given table and the caller; if any id is cross-tenant or foreign the
 *         whole batch rolls back (404).
 *       tags: [DynamicTables]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: tableId
 *           required: true
 *           schema: { type: string, format: cuid }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [ids]
 *               properties:
 *                 ids:
 *                   type: array
 *                   minItems: 1
 *                   maxItems: 200
 *                   items: { type: string, format: cuid }
 *       responses:
 *         '200': { description: 'Rows deleted; returns { deleted: number }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
