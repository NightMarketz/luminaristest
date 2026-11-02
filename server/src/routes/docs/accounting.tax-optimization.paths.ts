/**
 * OpenAPI de /api/accounting/tax-optimization (EFICIENCIA-FISCAL PR-1 e PR-4, BRIEF BE-INCR-EFICIENCIA-FISCAL §4.3).
 * Um arquivo por feature (dono, 2026-10-16).
 * @openapi
 * paths:
 *   /api/accounting/tax-optimization/policy:
 *     get:
 *       summary: Tax-efficiency policy of a unit (current version + history)
 *       description: >-
 *         Commercial policy only — it never switches a legal guard off (ADR D2). Without a saved version the defaults
 *         apply: criterioAlocacao PROPORCIONAL_CATALOGO, pisoServico CUSTO_INFORMADO, severidadePisoProporcional WARN.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'TaxOptimizationPolicyView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     put:
 *       summary: New version of the tax-efficiency policy
 *       description: >-
 *         PROPORCIONAL_CATALOGO applies at once (200) and closes the previous version on vigenteDesde minus one day.
 *         CARGA_TRIBUTARIA is not applied: it becomes a CRITERIO_CARGA suggestion that only the ACTIVE accountant
 *         decides (202); without one, 409 CRITERIO_CARGA_EXIGE_CONTADOR. 409 VIGENCIA_RETROATIVA when vigenteDesde is not
 *         after the latest version. Audited as tax.policy.updated.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, criterioAlocacao, pisoServico, vigenteDesde]
 *               properties:
 *                 unitId: { type: string }
 *                 criterioAlocacao: { type: string, enum: [PROPORCIONAL_CATALOGO, CARGA_TRIBUTARIA] }
 *                 pisoServico: { type: string, enum: [CUSTO_INFORMADO, CATALOGO_MINIMO, SEM_DESCONTO_ALEM_DO_PROPORCIONAL] }
 *                 vigenteDesde: { type: string, format: date }
 *       responses:
 *         '200': { description: '{ applied: true, policy }' }
 *         '202': { description: '{ applied: false, suggestion } (CARGA_TRIBUTARIA waits for the accountant)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '409': { description: 'CRITERIO_CARGA_EXIGE_CONTADOR | VIGENCIA_RETROATIVA' }
 *   /api/accounting/tax-optimization/service-costs:
 *     get:
 *       summary: Service cost evidences (service floor, F-EF-1 a)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'ServiceCostEvidenceView[] (cents as strings)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *     post:
 *       summary: Register a service cost (custoCents with sourceDocumentId) and/or a published minimum price
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, serviceRef, vigenteDesde]
 *               properties:
 *                 unitId: { type: string }
 *                 serviceRef: { type: string }
 *                 custoCents: { type: string, nullable: true }
 *                 catalogoMinimoCents: { type: string, nullable: true }
 *                 sourceDocumentId: { type: string, nullable: true }
 *                 vigenteDesde: { type: string, format: date }
 *                 vigenteAte: { type: string, format: date, nullable: true }
 *       responses:
 *         '201': { description: 'ServiceCostEvidenceView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *   /api/accounting/tax-optimization/service-costs/{id}:
 *     delete:
 *       summary: Soft-delete a service cost evidence
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'deleted' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *   /api/accounting/tax-optimization/suggestions:
 *     get:
 *       summary: Tax-efficiency suggestions of a unit (owner, or the ACTIVE accountant with ownerUserId)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: ownerUserId, required: false, schema: { type: string } }
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [PROPOSED, ACCEPTED, REJECTED, EXPIRED] } }
 *       responses:
 *         '200': { description: 'TaxOptimizationSuggestionView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *   /api/accounting/tax-optimization/suggestions/{id}/accept:
 *     post:
 *       summary: Accept a suggestion (ACTIVE accountant; without one, the owner; never the proposer)
 *       description: >-
 *         CRITERIO_CARGA is decided only by the ACTIVE accountant and requires a reason; accepting it creates the
 *         CARGA_TRIBUTARIA policy version. 409 SUGESTAO_JA_DECIDIDA when the status is no longer PROPOSED.
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
 *               required: [unitId]
 *               properties:
 *                 unitId: { type: string }
 *                 ownerUserId: { type: string }
 *                 reason: { type: string, minLength: 3, maxLength: 280 }
 *       responses:
 *         '200': { description: 'TaxOptimizationSuggestionView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'SUGESTAO_JA_DECIDIDA' }
 *   /api/accounting/tax-optimization/suggestions/{id}/reject:
 *     post:
 *       summary: Reject a suggestion (reason required)
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
 *               required: [unitId, reason]
 *               properties:
 *                 unitId: { type: string }
 *                 ownerUserId: { type: string }
 *                 reason: { type: string, minLength: 3, maxLength: 280 }
 *       responses:
 *         '200': { description: 'TaxOptimizationSuggestionView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'SUGESTAO_JA_DECIDIDA' }
 *   /api/accounting/tax-optimization/report:
 *     get:
 *       summary: Tax-saving report of a competence (EFICIENCIA-FISCAL PR-4 item 23)
 *       description: >-
 *         Sums only ACCEPTED suggestions with effect in the month (I-11; month = the COMPETENCIA subject, the sale month for
 *         SALE subjects, else the decision month in the scope time zone); PROPOSED, REJECTED and EXPIRED only appear in
 *         `contagem`. Measured lines (Simples ME/EPP only): segregation = DAS without the exclusion marks minus the computed DAS;
 *         unconditional discount = month discount × DAS ÷ PA revenue. Withholdings suffered (RETENCOES-FONTE) and IBS/CBS credit
 *         not taken (IBS-CBS-2027) are NAO_DISPONIVEL. Read only. Also exported as EXPORT_ECONOMIA_FISCAL.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: competencia, required: true, schema: { type: string, pattern: '^\d{4}-(0[1-9]|1[0-2])$' } }
 *       responses:
 *         '200': { description: 'TaxOptimizationReport { competencia, unitId, linhas[], totais, contagem, parametrosSha256 }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 */
export {};
