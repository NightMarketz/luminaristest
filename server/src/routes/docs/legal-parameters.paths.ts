/**
 * OpenAPI de /api/legal-parameters.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/legal-parameters:
 *     get:
 *       summary: List legal parameters of the platform (BE-INCR-LEGAL-PARAMS PR-1, item 11)
 *       description: >-
 *         Coeficientes e tabelas de lei como dado de plataforma (sem empresa). Qualquer autenticado lê.
 *       tags: [LegalParameters]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: tabela, required: false, schema: { type: string } }
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [DRAFT, PUBLISHED, REVOKED] } }
 *       responses:
 *         '200': { description: 'LegalParameterView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *     post:
 *       summary: Propose a legal parameter row as DRAFT (PLATFORM_ADMIN only, item 8)
 *       description: >-
 *         Linha append-only com fonte obrigatória. Correção de linha publicada = linha nova com supersedesId
 *         (mesma tabela, chave e discriminador). Só as tabelas já migradas aceitam proposta.
 *       tags: [LegalParameters]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [tabela, chave, fonte, vigenteDesde, motivo]
 *               properties:
 *                 tabela:        { type: string }
 *                 chave:         { type: string, minLength: 1, maxLength: 64 }
 *                 discriminador: { type: string, minLength: 1, maxLength: 64 }
 *                 valorInt:      { type: integer }
 *                 valorTexto:    { type: string, minLength: 1, maxLength: 64 }
 *                 valorJson:     {}
 *                 fonte:         { type: string, minLength: 1, maxLength: 500 }
 *                 fonteUrl:      { type: string, format: uri }
 *                 fonteSha256:   { type: string, pattern: '^[0-9a-f]{12,64}$' }
 *                 vigenteDesde:  { type: string, format: date }
 *                 vigenteAte:    { type: string, format: date }
 *                 supersedesId:  { type: string }
 *                 motivo:        { type: string, minLength: 1, maxLength: 500 }
 *       responses:
 *         '201': { description: 'LegalParameterView (status DRAFT)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'supersedesId não publicada' }
 *
 *   /api/legal-parameters/recalc-jobs:
 *     get:
 *       summary: Status of the legal-parameter recalculation queue (RECALC-STATUS)
 *       description: >-
 *         Jobs de recálculo gravados ao publicar/revogar uma linha (BE-INCR-LEGAL-PARAMS PR-4), mais recentes
 *         primeiro, com a linha legal que disparou cada um. Qualquer autenticado lê.
 *       tags: [LegalParameters]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [PENDING, DONE] } }
 *         - { in: query, name: legalParameterId, required: false, schema: { type: string } }
 *         - { in: query, name: page, required: false, schema: { type: integer, minimum: 1, default: 1 } }
 *         - { in: query, name: pageSize, required: false, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *       responses:
 *         '200': { description: '{ items: RecalcJobView[], total, page, pageSize }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/legal-parameters/vigente:
 *     get:
 *       summary: Lookup of the legal parameter in force on a date (item 4)
 *       tags: [LegalParameters]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: tabela, required: true, schema: { type: string } }
 *         - { in: query, name: chave, required: true, schema: { type: string } }
 *         - { in: query, name: data, required: true, schema: { type: string, format: date } }
 *         - { in: query, name: discriminador, required: false, schema: { type: string } }
 *       responses:
 *         '200': { description: 'LegalParameterView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/legal-parameters/{id}/publish:
 *     post:
 *       summary: Publish a DRAFT legal parameter (PLATFORM_ADMIN only, item 8)
 *       tags: [LegalParameters]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'LegalParameterView (status PUBLISHED)' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'não é rascunho, substituída já não publicada, ou empate de vigenteDesde' }
 *
 *   /api/legal-parameters/{id}/revoke:
 *     post:
 *       summary: Revoke a PUBLISHED legal parameter (PLATFORM_ADMIN only; only the status changes)
 *       tags: [LegalParameters]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'LegalParameterView (status REVOKED)' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'não está publicada' }
 */
export {};
