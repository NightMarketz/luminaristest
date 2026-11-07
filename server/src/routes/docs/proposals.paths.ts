/**
 * OpenAPI de /api/proposals (BE-INCR-TEAMMATES §2.4, PR-7 itens 31–32). Um arquivo por feature (dono, 2026-10-16).
 * Caixa única: propostas do chat e dos teammates; confirmar despacha pelo kind ao serviço dono.
 * @openapi
 * paths:
 *   /api/proposals:
 *     get:
 *       summary: List the owner's action proposals (chat and teammates together)
 *       tags: [Proposals]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: query
 *           name: status
 *           required: false
 *           schema: { type: string, enum: [PENDING, EXECUTED, REJECTED, EXPIRED], default: PENDING }
 *       responses:
 *         '200': { description: "Array of { id, kind, status, payload, teammate, channelMessageId, expiresAt, createdAt }" }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *   /api/proposals/{id}/confirm:
 *     post:
 *       summary: Confirm a proposal — dispatched by kind to the owning service
 *       tags: [Proposals]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string }
 *       responses:
 *         '200': { description: "Executed ({ id, status: EXECUTED, result })" }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: "PROPOSTA_EXPIRADA, PROPOSTA_NAO_PENDENTE or KIND_SEM_DESPACHANTE" }
 *   /api/proposals/{id}/reject:
 *     post:
 *       summary: Reject a pending proposal
 *       tags: [Proposals]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string }
 *       responses:
 *         '200': { description: "Rejected ({ id, status: REJECTED })" }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: "PROPOSTA_EXPIRADA or PROPOSTA_NAO_PENDENTE" }
 */
export {};
