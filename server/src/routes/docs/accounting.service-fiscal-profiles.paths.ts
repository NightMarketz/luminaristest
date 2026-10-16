/**
 * OpenAPI de /api/accounting/service-fiscal-profiles.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/service-fiscal-profiles:
 *     get:
 *       summary: List the per-service fiscal profiles of a unit (BE-INCR-DFE, nó X10b, F-DFE-6 a)
 *       description: >-
 *         One row per serviceRef (id of the `services` DynamicTable row) with the national service
 *         code (cTribNac — LC 116 list transcribed from Anexo I), NBS, INDOP (Anexo C) and the
 *         optional place of service. Soft-deleted rows are omitted.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'ServiceFiscalProfileView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting/service-fiscal-profiles/{serviceRef}:
 *     get:
 *       summary: Read one service fiscal profile
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: serviceRef, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'ServiceFiscalProfileView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     put:
 *       summary: Create or replace a service fiscal profile (idempotent upsert)
 *       description: >-
 *         cTribNac must exist in the transcribed national list (6 digits, e.g. 060101 barbearia /
 *         060201 esteticistas); cIndOp must exist in Anexo C (default 030101). Audited as
 *         service_fiscal_profile.updated (codes only, no free text).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: serviceRef, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, cTribNac]
 *               properties:
 *                 unitId: { type: string }
 *                 cTribNac: { type: string, description: '6 dígitos — lista nacional (Anexo I)' }
 *                 cTribMun: { type: string, nullable: true }
 *                 cNBS: { type: string, nullable: true, description: '9 dígitos (Anexo B) — obrigatório se IBSCBS informado (E0322)' }
 *                 cIndOp: { type: string, default: '030101' }
 *                 cLocPrestacao: { type: string, nullable: true, description: 'IBGE 7; null => FiscalProfile.codMun' }
 *                 xDescServ: { type: string, nullable: true }
 *       responses:
 *         '200': { description: 'ServiceFiscalProfileView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *     delete:
 *       summary: Soft-delete a service fiscal profile (rename-on-delete frees the key)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: serviceRef, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'deleted' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
