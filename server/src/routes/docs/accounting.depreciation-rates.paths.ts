/**
 * OpenAPI de /api/accounting/depreciation-rates.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/depreciation-rates:
 *     get:
 *       summary: List the unit depreciation rate table (BE-INCR-FIXED-ASSETS, nó C8, item 3)
 *       description: >-
 *         BE-INCR-LEGAL-PARAMS PR-3: union, in one shape, of the Anexo III (IN RFB 1.700/2017) rows of the
 *         PLATFORM table DEPRECIACAO_ANEXO_III in force today (origem=PLATAFORMA, id = legal parameter id;
 *         changed only by PLATFORM_ADMIN publication) and the scope CUSTOM rows (origem=ESCOPO).
 *         includeHidden=false (default) omits CUSTOM rows the operator hid; CUSTOM rows are created via POST below.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: includeHidden, schema: { type: string, enum: ['true', 'false'] } }
 *       responses:
 *         '200': { description: 'TaxaDepreciacaoView[] — {id, origem PLATAFORMA|ESCOPO, ncm, sourceRow, description, lifeYears, annualRateBp, source, sourceUrl, sourceSha256, justification, hiddenAt, createdAt}' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *     post:
 *       summary: Create a CUSTOM depreciation rate (item 2)
 *       description: >-
 *         Always source=CUSTOM, sourceRow=null (F-FA10 → a: no business-key uniqueness for CUSTOM rows,
 *         the key is the row id). ANEXO_* rows are never edited — a divergent rate is a new CUSTOM row.
 *         Audited as depreciation_rate.created (ids/numbers only — description/justification never enter
 *         the trail).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, description, lifeYears, annualRateBp, justification]
 *               properties:
 *                 unitId:        { type: string }
 *                 ncm:           { type: string }
 *                 description:   { type: string }
 *                 lifeYears:     { type: integer, minimum: 1 }
 *                 annualRateBp:  { type: integer, minimum: 1, maximum: 10000, description: '10% = 1000' }
 *                 justification: { type: string }
 *       responses:
 *         '201': { description: 'DepreciationRate' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting/depreciation-rates/{id}/hide:
 *     post:
 *       summary: Hide a depreciation rate (soft — item 2)
 *       description: >-
 *         Never deletes: a rate a FixedAsset already snapshotted stays readable by id. CUSTOM rows only —
 *         an Anexo III row is platform data (BE-INCR-LEGAL-PARAMS PR-3) and answers 404. Audited as
 *         depreciation_rate.hidden.
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
 *       responses:
 *         '200': { description: 'DepreciationRate' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
