/**
 * OpenAPI de /api/service-fiscal-suggestions.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/service-fiscal-suggestions:
 *     get:
 *       summary: Services without a fiscal profile in the unit, each with its fiscal suggestion (KIT-SETOR PR-K3, 7e)
 *       description: >-
 *         Só sugere (nada é gravado). Catálogo = o do kit de setor da unidade; sem kit ⇒ 400 UNIDADE_SEM_KIT. Camada 1 =
 *         sinônimos do catálogo; a IA de reserva roda só com ia=1, onde a camada 1 ficou vazia, até 20 por chamada.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: ia, required: false, schema: { type: string, enum: ['0', '1'] } }
 *       responses:
 *         '200': { description: 'PendingServiceSuggestion[] ({ serviceRef, nome, sugestoes: Suggestion[] })' }
 *         '400': { description: 'query inválida ou UNIDADE_SEM_KIT' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *   /api/service-fiscal-suggestions/preview:
 *     post:
 *       summary: Fiscal suggestion for a service name, for the service form (KIT-SETOR PR-K3, 7f)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { type: object, required: [unitId, nome], properties: { unitId: { type: string }, nome: { type: string, maxLength: 200 } } }
 *       responses:
 *         '200': { description: "Suggestion[] ({ key, cTribNac, cNBS?, label, origem: 'dicionario' | 'ia', termo? })" }
 *         '400': { description: 'body inválido ou UNIDADE_SEM_KIT' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 */
export {};
