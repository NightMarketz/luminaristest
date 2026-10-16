/**
 * OpenAPI de /api/accounting/company-fiscal-profile.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/company-fiscal-profile/{ano}:
 *     get:
 *       summary: Read the company fiscal profile of a calendar year (BE-INCR-FISCAL-OBLIGATION-PROFILE, nó X13)
 *       description: >-
 *         One profile per company (owner = CNPJ raiz, R8) and year (F-OBP-8 a). unitId only resolves the
 *         scope and the policy. 404 company_fiscal_profile_missing when the year has no profile.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: ano, required: true, schema: { type: integer, minimum: 2014, maximum: 2100 } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'CompanyFiscalProfileView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { description: 'company_fiscal_profile_missing' }
 *     put:
 *       summary: Create or replace the company fiscal profile of a year (idempotent upsert)
 *       description: >-
 *         regime in MEI, SIMPLES, PRESUMIDO, REAL (F-OBP-2 a). The ecf block is refused for MEI and SIMPLES
 *         (IN RFB 2.004/2021 art. 1 par. 1 I); livroCaixaSemEscrituracao and distribuicaoAcimaBase only apply
 *         to PRESUMIDO (IN RFB 2.003/2021 art. 3). contadorContactId must be a live AccountingContact of the
 *         scope and representanteLegalSignerId a live CompanySigner of the owner, else 404. Audited as
 *         company_fiscal_profile.updated (year, enums, booleans and ids only).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: ano, required: true, schema: { type: integer, minimum: 2014, maximum: 2100 } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, regime]
 *               properties:
 *                 unitId: { type: string }
 *                 regime: { type: string, enum: [MEI, SIMPLES, PRESUMIDO, REAL] }
 *                 grandePorte: { type: boolean, nullable: true }
 *                 inativa: { type: boolean, default: false }
 *                 condicoes:
 *                   type: object
 *                   properties:
 *                     aporteInvestidorAnjo: { type: boolean, nullable: true }
 *                     livroCaixaSemEscrituracao: { type: boolean, nullable: true }
 *                     distribuicaoAcimaBase: { type: boolean, nullable: true }
 *                 declarante: { type: object, nullable: true, description: 'Registers 0000/0030 fields, all optional (F-XP-2 a)' }
 *                 ecd:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     indNire: { type: string, enum: ['0', '1'] }
 *                     nire: { type: string }
 *                     numOrd: { type: string }
 *                     natLivr: { type: string }
 *                 ecf:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     indAliqCsll: { type: string, enum: ['1', '3', '4', '7', '8'] }
 *                     indRecReceita: { type: string, enum: ['1', '2'] }
 *                 contadorContactId: { type: string, nullable: true }
 *                 representanteLegalSignerId: { type: string, nullable: true }
 *       responses:
 *         '200': { description: 'CompanyFiscalProfileView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     delete:
 *       summary: Soft-delete the company fiscal profile of a year
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: ano, required: true, schema: { type: integer } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'deleted' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/company-fiscal-profile/{ano}/ecf-transmitida:
 *     post:
 *       summary: Record the receipt of the transmitted ECF and lock the year's regime (X13 PR-2, F-XP-5 a)
 *       description: >-
 *         After this call a PUT that changes regime answers 409 REGIME_TRAVADO and DELETE of the profile
 *         answers 409 (an ECF correction cannot change the regime, IN RFB 2.004/2021 art. 7 par. 2). Posting again
 *         replaces the receipt (correction) and keeps the original lock date. Audited as
 *         company_fiscal_profile.ecf_transmitted.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: ano, required: true, schema: { type: integer } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, recibo]
 *               properties:
 *                 unitId: { type: string }
 *                 recibo: { type: string, maxLength: 100 }
 *       responses:
 *         '200': { description: 'CompanyFiscalProfileView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/company-fiscal-profile/{ano}/obligations:
 *     get:
 *       summary: Which SPED obligations (ECD, ECF) apply to the company in the year, with the source rule
 *       description: >-
 *         Status per obligation is OBRIGATORIA, CONDICIONAL (with perguntaPendente), FACULTATIVA or
 *         NAO_SE_APLICA, resolved from a data matrix that cites IN RFB 2.003/2021 and 2.004/2021 (F-OBP-3/4 a).
 *         faltantes lists what the profile still lacks for obligations that are OBRIGATORIA or CONDICIONAL.
 *         No profile for the year returns 200 with perfil AUSENTE.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: ano, required: true, schema: { type: integer } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'CompanyObligationsView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting/company-fiscal-profile/{ano}/copiar-de/{anoAnterior}:
 *     post:
 *       summary: Copy the company fiscal profile from a previous year (F-XP-2/3 a)
 *       description: >-
 *         Copies everything except the book order number (numOrd changes every year) and the ECF receipt and
 *         lock. 404 when the source year has no profile; 409 company_fiscal_profile_exists when the target
 *         year already has one (use PUT to edit).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: ano, required: true, schema: { type: integer } }
 *         - { in: path, name: anoAnterior, required: true, schema: { type: integer } }
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
 *         '201': { description: 'CompanyFiscalProfileView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'company_fiscal_profile_exists' }
 */
export {};
