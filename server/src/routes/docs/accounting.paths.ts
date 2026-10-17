/**
 * OpenAPI de /api/accounting.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *
 *   # ─── ACCOUNTING PERIODS (INCR-1) ─────────────────────────────────────────
 *
 *   /api/accounting/{unitId}/periods:
 *     get:
 *       summary: List accounting periods for a fiscal year
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: year, required: true, schema: { type: integer } }
 *         - { in: query, name: ownerUserId, required: false, schema: { type: string }, description: "GOV-CONTADOR: dono que o contador responsavel atende; ausente = escopo do proprio usuario; sem atribuicao ACTIVE do par = 403 ACCOUNTANT_NOT_ASSIGNED" }
 *       responses:
 *         '200':
 *           description: List of accounting periods
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data: { type: array, items: { type: object } }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/{unitId}/periods/seed-year:
 *     post:
 *       summary: Seed 12 FUTURE periods for a fiscal year
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: unitId, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SeedYearInput' }
 *       responses:
 *         '201':
 *           description: Periods seeded
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data: { type: array, items: { type: object } }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 */
export {};
