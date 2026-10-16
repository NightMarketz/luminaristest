/**
 * OpenAPI de /api/accounting/post.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *
 *   # ─── ACCOUNTING ────────────────────────────────────────────────────────
 *
 *   /api/accounting/post:
 *     post:
 *       summary: Post a balanced double-entry journal entry
 *       description: ΣdebitCents must equal ΣcreditCents (exact integer equality). Idempotent on (sourceType, sourceId) per unit.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, date, description, lines]
 *               properties:
 *                 unitId:      { type: string }
 *                 date:        { type: string, description: ISO date/datetime string }
 *                 description: { type: string }
 *                 sourceType:  { type: string, default: manual }
 *                 sourceId:    { type: string }
 *                 lines:
 *                   type: array
 *                   minItems: 2
 *                   items:
 *                     type: object
 *                     required: [accountCode, debitCents, creditCents]
 *                     properties:
 *                       accountCode: { type: string, description: Code of a leaf account (acceptsEntries=true) }
 *                       debitCents:  { type: integer, minimum: 0 }
 *                       creditCents: { type: integer, minimum: 0 }
 *       responses:
 *         '201':
 *           description: Journal entry posted
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:    { type: object, description: The posted journal entry with its postings }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 */
export {};
