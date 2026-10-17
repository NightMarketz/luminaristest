/**
 * OpenAPI de /api/accounting/reverse.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/reverse:
 *     post:
 *       summary: Reverse a posted journal entry (estorno)
 *       description: Posted entries are immutable; corrections are made via a reversing entry. Idempotent — reversing twice returns the existing reversal.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, lancamentoId]
 *               properties:
 *                 unitId:       { type: string }
 *                 lancamentoId: { type: string }
 *                 reason:       { type: string }
 *       responses:
 *         '200':
 *           description: Reversing entry created (or the existing one if already reversed)
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:    { type: object }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 */
export {};
