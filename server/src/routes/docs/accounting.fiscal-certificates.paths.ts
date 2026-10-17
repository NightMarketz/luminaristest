/**
 * OpenAPI de /api/accounting/fiscal-certificates.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/fiscal-certificates/{unitId}:
 *     put:
 *       summary: Upload the unit's fiscal certificate (PFX/P12 + password); stored encrypted, never returned
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: unitId, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               required: [file, senha]
 *               properties:
 *                 file:  { type: string, format: binary }
 *                 senha: { type: string, minLength: 1, maxLength: 128 }
 *       responses:
 *         '200':
 *           description: Public view (no key, certificate or password)
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:
 *                     type: object
 *                     properties:
 *                       unitId:            { type: string }
 *                       cnpjCertificado:   { type: string }
 *                       notBefore:         { type: string, format: date }
 *                       notAfter:          { type: string, format: date }
 *                       diasParaVencer:    { type: integer }
 *                       fingerprintSha256: { type: string }
 *                       setAt:             { type: string, format: date-time }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '413': { description: File too large }
 *         '422': { description: certificado_senha_invalida | certificado_ilegivel | certificado_chave_nao_corresponde | certificado_sem_cnpj | certificado_cnpj_divergente | certificado_vencido | unidade_sem_cnpj }
 *         '503': { description: dfe_cert_key_missing (DFE_CERT_KEYS not provisioned) }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *     get:
 *       summary: Public view of the unit's fiscal certificate (no secret)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200':
 *           description: Public view (no key, certificate or password)
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:
 *                     type: object
 *                     properties:
 *                       unitId:            { type: string }
 *                       cnpjCertificado:   { type: string }
 *                       notBefore:         { type: string, format: date }
 *                       notAfter:          { type: string, format: date }
 *                       diasParaVencer:    { type: integer }
 *                       fingerprintSha256: { type: string }
 *                       setAt:             { type: string, format: date-time }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *     delete:
 *       summary: Soft-delete the unit's fiscal certificate (ciphertext wiped)
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
 */
export {};
