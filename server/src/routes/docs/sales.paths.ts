/**
 * OpenAPI de /api/sales.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/sales/cancel:
 *     post:
 *       summary: Cancel a finalized salon sale (status → Cancelled; reverses the revenue entry)
 *       tags: [Sales]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [tableId, saleId]
 *               properties:
 *                 tableId: { type: string }
 *                 saleId:  { type: string }
 *                 reason:  { type: string, description: "Optional reason recorded on the sale (audit)." }
 *       responses:
 *         '200':
 *           description: Updated sale record (status Cancelled)
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data: { type: object }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/sales/return:
 *     post:
 *       summary: Return a finalized salon sale (status → Returned; books a contra-revenue entry)
 *       tags: [Sales]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [tableId, saleId]
 *               properties:
 *                 tableId: { type: string }
 *                 saleId:  { type: string }
 *                 reason:  { type: string, description: "Optional reason recorded on the sale (audit)." }
 *       responses:
 *         '200':
 *           description: Updated sale record (status Returned)
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data: { type: object }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/sales/pay:
 *     post:
 *       summary: Register payment for a finalized salon sale (paymentStatus → Paid; books the settlement entry)
 *       description: >-
 *         The only sanctioned path to move a Finalized sale to Paid. Performs a whitelisted
 *         isSystem write (paymentStatus/paymentMethod/paidAt/paidByUserId/paymentReference) and,
 *         post-commit, books D <account by paymentMethod> / C 1.1.2 A Receber (sourceType
 *         sale.settled). Settlement is deferred if the revenue entry does not yet exist.
 *       tags: [Sales]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [tableId, saleId, paymentMethod]
 *               properties:
 *                 tableId:          { type: string }
 *                 saleId:           { type: string }
 *                 paymentMethod:    { type: string, enum: [Credit Card, Debit Card, Cash, Pix, Package Balance] }
 *                 paidAt:           { type: string, description: "ISO datetime the payment occurred (settlement date). Defaults to now." }
 *                 paymentReference: { type: string, description: "Optional external reference (NSU, transaction id…)." }
 *       responses:
 *         '200':
 *           description: Updated sale record (paymentStatus Paid)
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data: { type: object }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 */
export {};
