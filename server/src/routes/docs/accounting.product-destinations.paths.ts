/**
 * OpenAPI de /api/accounting/product-destinations.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/product-destinations:
 *     get:
 *       summary: List the per-product default item destination of a unit (ITEM-DESTINATION PR-2, F-ID-2 a)
 *       description: >-
 *         One row per productRef (id of the `products` DynamicTable row). The NF-e purchase import/preview
 *         uses it when the item mapping has no explicit destination (origem PRODUTO). Soft-deleted rows are omitted.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'ProductDestinationView[] ({ productRef, destination, updatedAt })' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     put:
 *       summary: Create or replace the default destination of a product (idempotent; revives a cleared row)
 *       description: >-
 *         destination ∈ REVENDA | INSUMO_SERVICO (IMOBILIZADO needs the asset class, never a product default).
 *         The product must exist in the account's `products` table (400 otherwise). The import never writes
 *         this default (F-ID-9 a). Audited as product_destination.set.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, productRef, destination]
 *               properties:
 *                 unitId: { type: string }
 *                 productRef: { type: string }
 *                 destination: { type: string, enum: [REVENDA, INSUMO_SERVICO] }
 *       responses:
 *         '200': { description: 'ProductDestinationView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/product-destinations/{productRef}:
 *     delete:
 *       summary: Clear (soft-delete) the default destination of a product
 *       description: Audited as product_destination.cleared. Items of that product fall back to REVENDA/FALLBACK.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: productRef, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'cleared' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 */
export {};
