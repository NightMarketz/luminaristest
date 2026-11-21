/**
 * OpenAPI de /api/accounting/insumo-stock-counts (BE-INCR-INSUMO-INVENTARIO-PERIODICO, BRIEF item 4).
 * Um arquivo por feature (dono, 2026-10-16).
 * @openapi
 * paths:
 *   /api/accounting/insumo-stock-counts:
 *     post:
 *       summary: Post the periodic count of the service-supply stock (F-ID-3 c, NBC TG 1002 item 13.6)
 *       description: >-
 *         The unit's fiscal profile must have insumoStockAccountId and insumoExpenseAccountId (400
 *         insumo_stock_account_not_configured otherwise). bookValueCents is the balance of the supply-stock account up to
 *         countDate; adjustmentCents = book − counted. A positive adjustment posts D insumoExpense / C insumoStock
 *         (consumption), a negative one the reverse, zero posts nothing. One count per (unit, countDate): a second one is
 *         409 INSUMO_COUNT_ALREADY_POSTED (reverse the entry to recount). The period gate is the ledger's.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, countDate, countedValueCents]
 *               properties:
 *                 unitId: { type: string }
 *                 countDate: { type: string, format: date }
 *                 countedValueCents: { type: integer, minimum: 0 }
 *       responses:
 *         '201': { description: 'InsumoStockCountView ({ countDate, bookValueCents, countedValueCents, adjustmentCents, entryId })' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { description: 'INSUMO_COUNT_ALREADY_POSTED — count already posted for this date' }
 */
export {};
