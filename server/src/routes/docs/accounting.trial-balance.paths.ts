/**
 * OpenAPI de /api/accounting/trial-balance.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/trial-balance:
 *     get:
 *       summary: Trial balance (balancete) for a unit
 *       description: Aggregates Posted + Reversed postings (Draft excluded) per account.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: from, required: false, schema: { type: string }, description: ISO date — inclusive lower bound }
 *         - { in: query, name: to,   required: false, schema: { type: string }, description: ISO date — inclusive upper bound }
 *       responses:
 *         '200':
 *           description: Trial balance rows
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:    { type: object }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 */
export {};
