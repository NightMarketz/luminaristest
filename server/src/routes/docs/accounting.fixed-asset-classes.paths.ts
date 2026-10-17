/**
 * OpenAPI de /api/accounting/fixed-asset-classes.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/fixed-asset-classes:
 *     get:
 *       summary: List fixed-asset classes of a unit (BE-INCR-FIXED-ASSETS, nó C8, item 1)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'FixedAssetClass[]' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     post:
 *       summary: Create a fixed-asset class (item 1)
 *       description: >-
 *         depreciable=true requires accumulatedDepreciationAccountId (superRefine); LAND-type classes
 *         are created with depreciable=false (F-FA5 → a) — no code-level enforcement on the name, it is
 *         a usage convention.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CreateFixedAssetClassInput' }
 *       responses:
 *         '201': { description: 'FixedAssetClass' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/fixed-asset-classes/{id}:
 *     patch:
 *       summary: Update a fixed-asset class
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UpdateFixedAssetClassInput' }
 *       responses:
 *         '200': { description: 'FixedAssetClass' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *     delete:
 *       summary: Soft-delete a fixed-asset class (item 7)
 *       description: Blocked (400) while the class has any live FixedAsset (in any status).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/DeleteFixedAssetClassInput' }
 *       responses:
 *         '200': { description: 'FixedAssetClass' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 */
export {};
