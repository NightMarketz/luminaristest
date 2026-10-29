/**
 * OpenAPI de /api/accounting/nfce-cscs (X10a PR-8; D-2026-10-29-X10A-PR7-9-FORKS decisão 3). Nenhuma resposta carrega o CSC.
 * @openapi
 * paths:
 *   /api/accounting/nfce-cscs/{unitId}:
 *     put:
 *       summary: Store (or replace) the unit's NFC-e CSC for one environment (encrypted with DFE_PSC_KEYS)
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
 *               required: [ambiente, cscId, csc]
 *               properties:
 *                 ambiente: { type: string, enum: [producao, homologacao] }
 *                 cscId:    { type: string, pattern: '^\d{1,6}$' }
 *                 csc:      { type: string, pattern: '^[0-9A-Za-z]{16,36}$' }
 *       responses:
 *         '200': { description: Public view (unitId, ambiente, cscId, createdAt) — never the CSC }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '503': { description: dfe_psc_key_missing }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *     get:
 *       summary: The unit's live NFC-e CSCs (identifier only)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: List of public views }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *     delete:
 *       summary: Remove the unit's NFC-e CSC for one environment (soft-delete, ciphertext zeroed)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: ambiente, required: true, schema: { type: string, enum: [producao, homologacao] } }
 *       responses:
 *         '204': { description: Removed }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
