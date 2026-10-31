/**
 * OpenAPI de /api/accounting/psc-credentials e /api/accounting/psc-providers (X10a PR-7; EMENDA-PSC E-2..E-5).
 * @openapi
 * paths:
 *   /api/accounting/psc-credentials/{unitId}/authorize:
 *     post:
 *       summary: Start the OAuth 2.0 + PKCE authorization at the cloud-certificate provider (PSC); returns the URL
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: unitId, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [pscProviderId, escopo]
 *               properties:
 *                 pscProviderId: { type: string }
 *                 escopo: { type: array, items: { type: string, enum: [NFSE_DPS, NFE, NFCE] } }
 *       responses:
 *         '200':
 *           description: Authorization URL (state signed, code_challenge S256)
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:
 *                     type: object
 *                     properties:
 *                       authorizationUrl: { type: string }
 *                       expiresAt:        { type: string, format: date-time }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '422': { description: psc_nao_homologado | unidade_sem_cnpj }
 *         '503': { description: dfe_psc_key_missing | dfe_psc_redirect_missing }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *   /api/accounting/psc-credentials/callback:
 *     get:
 *       summary: OAuth return from the PSC (public; authenticated by the signed state)
 *       tags: [Accounting]
 *       parameters:
 *         - { in: query, name: state, required: true, schema: { type: string } }
 *         - { in: query, name: code, required: false, schema: { type: string } }
 *         - { in: query, name: error, required: false, schema: { type: string } }
 *       responses:
 *         '200': { description: Credential stored; public view (no token) }
 *         '400': { description: psc_state_invalido | psc_autorizacao_negada | psc_autorizacao_erro }
 *         '422': { description: psc_certificado_nao_e_da_unidade | psc_nao_homologado | unidade_sem_cnpj }
 *         '502': { description: psc_indisponivel | psc_resposta_invalida }
 *         '503': { description: dfe_psc_key_missing | dfe_psc_redirect_missing }
 *   /api/accounting/psc-credentials/{unitId}:
 *     get:
 *       summary: Public view of the unit's PSC credential (no token), with warnings
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200':
 *           description: Public view
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:
 *                     type: object
 *                     properties:
 *                       unitId:        { type: string }
 *                       psc:           { type: string }
 *                       titularCnpj:   { type: string }
 *                       certNotAfter:  { type: string, format: date }
 *                       tokenExpiraEm: { type: string, format: date-time }
 *                       consumoNoAno:  { type: integer }
 *                       cotaAnual:     { type: integer, nullable: true }
 *                       avisos:        { type: array, items: { type: string } }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *     delete:
 *       summary: Soft-delete the unit's PSC credential (token ciphertext wiped)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '204': { description: Removed }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *   /api/accounting/psc-providers:
 *     get:
 *       summary: List the homologated PSCs (PLATFORM_ADMIN only; client secret never returned)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200': { description: Provider views }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *     post:
 *       summary: Register a PSC (PLATFORM_ADMIN only; client secret stored encrypted)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [nome, baseUrl, clientId, clientSecret, algoritmos]
 *               properties:
 *                 nome:                { type: string }
 *                 baseUrl:             { type: string, description: https only }
 *                 clientId:            { type: string }
 *                 clientSecret:        { type: string }
 *                 cotaAnual:           { type: integer, nullable: true }
 *                 lifetimeMaxSegundos: { type: integer, nullable: true }
 *                 algoritmos:          { type: array, items: { type: string } }
 *                 habilitadoEm:        { type: string, format: date-time, nullable: true }
 *       responses:
 *         '201': { description: Provider view }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '503': { description: dfe_psc_key_missing }
 *   /api/accounting/psc-providers/{id}:
 *     patch:
 *       summary: Update a PSC (PLATFORM_ADMIN only)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { type: object }
 *       responses:
 *         '200': { description: Provider view }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     delete:
 *       summary: Soft-delete a PSC (PLATFORM_ADMIN only)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       responses:
 *         '204': { description: Removed }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
