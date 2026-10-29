/**
 * OpenAPI de /api/collection-charges.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/collection-charges:
 *     get:
 *       summary: List the unit's provider charges, paginated (FE-INCR-PAYMENT-PROVIDER-EMENDA-1 PR-0) — never the payer
 *       description: "Order createdAt desc, id desc. Unknown query parameter or invalid status/kind ⇒ 400."
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [CREATING, PENDING, PAID, PARTIALLY_REFUNDED, CHARGED_BACK, REFUNDED, EXPIRED, CANCELLED, FAILED] } }
 *         - { in: query, name: kind, required: false, schema: { type: string, enum: [BOLETO, PIX] } }
 *         - { in: query, name: page, required: false, schema: { type: integer, minimum: 1, default: 1 } }
 *         - { in: query, name: limit, required: false, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *       responses:
 *         '200': { description: '{ items: (CollectionChargeView + receivableDocumentNumber + receivableCancelled)[], total, page, limit }' }
 *         '400': { $ref: '#/components/responses/ValidationError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *   /api/collection-charges/{id}:
 *     get:
 *       summary: Read a provider charge (P2-15) — payer only for who manages receivables
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'CollectionChargeView' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *   /api/collection-charges/{id}/cancel:
 *     post:
 *       summary: Cancel a PENDING provider charge (P2-10); provider 409 ⇒ re-query and apply the real state
 *       description: "409: CHARGE_NOT_PENDING"
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { type: object, required: [unitId], properties: { unitId: { type: string } } }
 *       responses:
 *         '200': { description: 'CollectionChargeView' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *         '502': { description: 'provider_credential_invalid | provider_unavailable' }
 */
export {};
