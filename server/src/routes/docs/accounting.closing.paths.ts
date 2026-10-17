/**
 * OpenAPI de /api/accounting/closing.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/closing/exercise:
 *     post:
 *       summary: Close the result of a fiscal year (encerramento do exercício)
 *       description: >-
 *         Posts a real balanced closing entry (sourceType closing) dated year-12-31 that
 *         zeroes every result account against retained earnings (Lucros ou Prejuízos
 *         Acumulados). Idempotent per exercise. Makes the ECD reconcile in value (I155 of
 *         December equals zero, J100 balances with detail) and enables the I350/I355
 *         registers. Blocks with 400 when there is no result balance to close; the period
 *         gate surfaces its own error when December is not open. Reopen by reversing the
 *         returned entry via POST /accounting/reverse (that frees the idempotency key).
 *         Also 400 (details.taxAssessmentIds) when any IRPJ/CSLL assessment of the company in the year is
 *         CONFIRMED with its provision pending (X7 item 18, F-TA-8 a).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, year]
 *               properties:
 *                 unitId: { type: string }
 *                 year:   { type: integer, example: 2026 }
 *       responses:
 *         '201':
 *           description: Closing entry posted (or the existing one on a re-close)
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:    { type: object, description: 'The posted closing JournalEntry with its postings' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 */
export {};
