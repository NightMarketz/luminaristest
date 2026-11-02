/**
 * OpenAPI de /api/accounting/nfce-contingencia (X10a PR-9; BE-INCR-NFCE-EMENDA-1 E-9; D-2026-10-29-X10A-PR7-9-FORKS
 * decisões 4 e 8: o operador liga e desliga a contingência off-line da NFC-e; a entrada automática sai sozinha).
 * @openapi
 * paths:
 *   /api/accounting/nfce-contingencia/{unitId}:
 *     put:
 *       summary: Turn the unit's NFC-e offline contingency (tpEmis=9) on or off for one environment
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
 *               required: [ambiente, ativa]
 *               properties:
 *                 ambiente: { type: string, enum: [producao, homologacao] }
 *                 ativa:    { type: boolean }
 *                 xJust:    { type: string, minLength: 15, maxLength: 256, description: Required to turn it on (B29) }
 *       responses:
 *         '200': { description: State (unitId, ambiente, ativa, origem, dhCont, xJust) }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *     get:
 *       summary: The unit's NFC-e offline contingency state in both environments
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: List of states }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 */
export {};
