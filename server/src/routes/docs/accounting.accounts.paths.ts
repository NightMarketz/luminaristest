/**
 * OpenAPI de /api/accounting/accounts.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/accounts:
 *     get:
 *       summary: List the chart of accounts for a unit
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200':
 *           description: Accounts list
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:
 *                     type: object
 *                     properties:
 *                       accounts: { type: array, items: { type: object } }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *     post:
 *       summary: Create a user-defined account in the chart of accounts
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [code, name, nature, unitId]
 *               properties:
 *                 code:           { type: string }
 *                 name:           { type: string }
 *                 nature:         { type: string, enum: [Asset, Liability, Equity, Revenue, Expense] }
 *                 acceptsEntries: { type: boolean, default: true }
 *                 unitId:         { type: string }
 *       responses:
 *         '201':
 *           description: Account created
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:
 *                     type: object
 *                     properties:
 *                       account: { type: object }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *
 *   /api/accounting/accounts/{id}:
 *     delete:
 *       summary: Soft-delete a user-defined account (unit-scoped)
 *       description: unitId is required so the delete is scoped to its unit. Canonical accounts and accounts with postings cannot be deleted.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path,  name: id,     required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200':
 *           description: Account soft-deleted
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: Account is canonical or has postings — cannot be deleted }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 */
export {};
