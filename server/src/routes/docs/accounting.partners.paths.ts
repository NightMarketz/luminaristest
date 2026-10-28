/**
 * OpenAPI de /api/accounting/partners (BE-INCR-IRRF-DISTRIBUICAO PR-1, BRIEF itens 1–4).
 * Um arquivo por feature (dono, 2026-10-16).
 * @openapi
 * paths:
 *   /api/accounting/partners:
 *     get:
 *       summary: List the partners in force on a date and the sum of their shares (F-IRD-14)
 *       description: >-
 *         data defaults to today in the scope time zone. somaParticipacaoBp different from 10000 does not block the
 *         registry; it only returns a warning (it blocks the interest on equity later).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: data, required: false, schema: { type: string, format: date } }
 *       responses:
 *         '200': { description: '{ data, socios: PartnerView[], somaParticipacaoBp, aviso }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     post:
 *       summary: Register a partner (CPF or CNPJ with check digits; tipoPessoa derived from the length)
 *       description: >-
 *         Non-resident partners are accepted here (F-IRD-7). Two validity ranges of the same taxId in the same company
 *         that overlap → 409 VIGENCIA_SOBREPOSTA. Audited as partner.created without name or taxId.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, nome, taxId, residenteBrasil, participacaoBp, entradaEm]
 *               properties:
 *                 unitId: { type: string }
 *                 nome: { type: string }
 *                 taxId: { type: string, description: '11 or 14 digits' }
 *                 residenteBrasil: { type: boolean }
 *                 participacaoBp: { type: integer, minimum: 0, maximum: 10000 }
 *                 entradaEm: { type: string, format: date }
 *                 saidaEm: { type: string, format: date, nullable: true }
 *       responses:
 *         '201': { description: 'PartnerView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { description: 'VIGENCIA_SOBREPOSTA or deleted unit' }
 *
 *   /api/accounting/partners/{id}:
 *     get:
 *       summary: Read one partner
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'PartnerView' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     put:
 *       summary: Replace a partner (same body as POST; the overlap gate skips the row itself)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, nome, taxId, residenteBrasil, participacaoBp, entradaEm]
 *       responses:
 *         '200': { description: 'PartnerView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { description: 'VIGENCIA_SOBREPOSTA or deleted unit' }
 *     delete:
 *       summary: Soft-delete a partner
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'deleted' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { description: 'SOCIO_COM_DISTRIBUICAO (partner has profit distribution or JCP; set saidaEm instead) or deleted unit' }
 */
export {};
