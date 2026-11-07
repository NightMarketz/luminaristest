/**
 * OpenAPI de /api/teammates (BE-INCR-TEAMMATES §2.4). Um arquivo por feature (dono, 2026-10-16).
 * PR-1: credenciais de IA do tenant (item 7) — a leitura nunca traz a chave.
 * @openapi
 * paths:
 *   /api/teammates/credentials:
 *     get:
 *       summary: List the tenant's AI provider credentials (never the key)
 *       tags: [Teammates]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200': { description: "Array of { id, provider, last4, monthlyTokenBudget, createdAt }" }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *     post:
 *       summary: Store an AI provider key (BYOK), encrypted at rest
 *       tags: [Teammates]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [provider, apiKey]
 *               properties:
 *                 provider: { type: string, enum: [anthropic, openai, gemini] }
 *                 apiKey: { type: string, minLength: 10 }
 *                 monthlyTokenBudget: { type: integer, minimum: 1 }
 *       responses:
 *         '201': { description: "Credential created ({ id, provider, last4, monthlyTokenBudget, createdAt })" }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '409': { description: A live credential for this provider already exists }
 *         '503': { description: "Keyring not provisioned (llm_credential_key_missing)" }
 *   /api/teammates/credentials/{id}:
 *     delete:
 *       summary: Delete an AI provider credential (soft-delete; the provider can be registered again)
 *       tags: [Teammates]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string }
 *       responses:
 *         '200': { description: Credential deleted }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
