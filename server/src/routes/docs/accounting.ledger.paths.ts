/**
 * OpenAPI de /api/accounting/ledger.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/ledger:
 *     get:
 *       summary: Per-account ledger (razão) for a unit
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: accountCode, required: true, schema: { type: string } }
 *         - { in: query, name: from, required: false, schema: { type: string } }
 *         - { in: query, name: to,   required: false, schema: { type: string } }
 *       responses:
 *         '200':
 *           description: Ledger entries for the account
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:    { type: object }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 */
export {};
