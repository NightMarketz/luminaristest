/**
 * OpenAPI de /api/dimensions.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/dimensions:
 *     get:
 *       summary: List the dimension catalog — axes + their values (INCR-DIM)
 *       description: >-
 *         Returns each dimension definition (axis, e.g. cost center / project) with its values
 *         (flat, carrying parentId — the rollup tree is in the data). A dimension is metadata
 *         orthogonal to the ledger (ACC-024).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: includeArchived, required: false, schema: { type: boolean } }
 *       responses:
 *         '200': { description: 'definitions each with their values' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/dimensions/definitions:
 *     post:
 *       summary: Create a dimension axis (cost center, project…)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, code, name]
 *               properties:
 *                 unitId: { type: string }
 *                 code:   { type: string }
 *                 name:   { type: string }
 *       responses:
 *         '201': { description: 'the created definition' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/dimensions/definitions/{id}/archive:
 *     post:
 *       summary: Archive an axis (its values must be archived first)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId]
 *               properties:
 *                 unitId: { type: string }
 *       responses:
 *         '200': { description: 'the archived definition' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/dimensions/values:
 *     post:
 *       summary: Create a value in an axis (optional rollup parent, same axis — ACC-026)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, definitionId, code, name]
 *               properties:
 *                 unitId:       { type: string }
 *                 definitionId: { type: string }
 *                 code:         { type: string }
 *                 name:         { type: string }
 *                 parentId:     { type: string }
 *       responses:
 *         '201': { description: 'the created value' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/dimensions/values/{id}/archive:
 *     post:
 *       summary: Archive a value (its children must be archived first; historical tags preserved)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId]
 *               properties:
 *                 unitId: { type: string }
 *       responses:
 *         '200': { description: 'the archived value' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/dimensions/reports/balance:
 *     get:
 *       summary: Balancete recortado por dimensão (per account within each value, with rollup)
 *       description: >-
 *         Trial-balance sliced by one axis. Each dimension value gets its own + rolled-up
 *         (descendants via parentId) debit/credit/balance, plus a "(sem dimensão)" bucket for
 *         untagged legs. Summing every bucket reproduces the trial balance for the window (ACC-024).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: definitionId, required: true, schema: { type: string } }
 *         - { in: query, name: from, required: false, schema: { type: string } }
 *         - { in: query, name: to, required: false, schema: { type: string } }
 *       responses:
 *         '200': { description: 'buckets per dimension value with account rows + rollup' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/dimensions/reports/result:
 *     get:
 *       summary: DRE por dimensão (Revenue/Expense net per value, with rollup)
 *       description: >-
 *         Income statement sliced by one axis: revenue (credit-normal) minus expense (debit-normal)
 *         per dimension value, own + rolled-up, plus a "(sem dimensão)" bucket. Read-only.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: definitionId, required: true, schema: { type: string } }
 *         - { in: query, name: from, required: false, schema: { type: string } }
 *         - { in: query, name: to, required: false, schema: { type: string } }
 *       responses:
 *         '200': { description: 'result buckets per dimension value with rollup' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 */
export {};
