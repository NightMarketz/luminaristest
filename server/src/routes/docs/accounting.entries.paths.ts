/**
 * OpenAPI de /api/accounting/entries.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/entries:
 *     get:
 *       summary: List journal entries (lançamentos) for a unit, paginated
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: page,  required: false, schema: { type: integer, minimum: 1, default: 1 } }
 *         - { in: query, name: limit, required: false, schema: { type: integer, minimum: 1, maximum: 200, default: 50 } }
 *       responses:
 *         '200':
 *           description: Journal entries page
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:
 *                     type: object
 *                     properties:
 *                       entries: { type: array, items: { type: object } }
 *                       total:   { type: integer }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 */
export {};
