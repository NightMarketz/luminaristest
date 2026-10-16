/**
 * OpenAPI de /api/accounting/iss-beneficios-municipais.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/iss-beneficios-municipais:
 *     get:
 *       summary: List the municipal ISS benefits of a unit (SIMPLES-PISO-ANEXO-XI bloco 1, F-PI-1 a)
 *       description: >-
 *         Isenção / redução / valor fixo de ISS concedido pelo Município à ME/EPP do Simples (Res. CGSN 140
 *         arts. 31-32). Soft-deleted rows are omitted.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'IssBeneficioMunicipalView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *     post:
 *       summary: Register a municipal ISS benefit
 *       description: >-
 *         The benefit reduces the effective ISS percentage of the Simples bracket (art. 32 § 1º) and cannot
 *         result in less than 2% except for LC 116 subitems 7.02, 7.05 and 16.01 (art. 31 p.ú.). 409 when
 *         another benefit of the same Município overlaps in validity and services. Audited as
 *         iss_beneficio_municipal.created (codes/dates only; the legislation text stays out).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, codMun, tipo, reducaoBpPorFaixa, legislacao, vigenteDesde]
 *               properties:
 *                 unitId: { type: string }
 *                 codMun: { type: string, description: 'IBGE 7' }
 *                 cTribNacPrefixos: { type: array, items: { type: string }, description: '4 ou 6 dígitos; [] = todos os serviços' }
 *                 tipo: { type: string, enum: [ISENCAO, REDUCAO_PERCENTUAL, VALOR_FIXO] }
 *                 reducaoBpPorFaixa: { type: array, nullable: true, items: { type: integer }, description: '1 ou 6 valores em bp (0..10000)' }
 *                 legislacao: { type: string }
 *                 vigenteDesde: { type: string, format: date }
 *                 vigenteAte: { type: string, format: date, nullable: true }
 *       responses:
 *         '201': { description: 'IssBeneficioMunicipalView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '409': { description: 'benefício sobreposto' }
 *
 *   /api/accounting/iss-beneficios-municipais/{id}:
 *     get:
 *       summary: Read one municipal ISS benefit
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'IssBeneficioMunicipalView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     put:
 *       summary: Replace a municipal ISS benefit (same body as POST)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'IssBeneficioMunicipalView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'benefício sobreposto' }
 *     delete:
 *       summary: Soft-delete a municipal ISS benefit
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'deleted' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
