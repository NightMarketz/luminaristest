/**
 * OpenAPI de /api/teammates (BE-INCR-TEAMMATES §2.4). Um arquivo por feature (dono, 2026-10-16).
 * PR-1: credenciais de IA do tenant (item 7) — a leitura nunca traz a chave.
 * PR-2: CRUD do teammate (itens 10–12) — alçada só aperta (ALCADA_INVALIDA), ferramentas do registro ou MCP do tenant.
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
 *   /api/teammates:
 *     get:
 *       summary: List the tenant's teammates
 *       tags: [Teammates]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200': { description: Array of teammates }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *     post:
 *       summary: Create a teammate (allowedTools from the tool registry or the tenant's MCP servers)
 *       tags: [Teammates]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { type: object, description: 'TeammateCreateSchema / TeammateUpdateSchema (BE-INCR-TEAMMATES §2.2)' }
 *       responses:
 *         '201': { description: Teammate created }
 *         '400': { description: "Validation failed, ALCADA_INVALIDA or FERRAMENTA_INVALIDA" }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *   /api/teammates/{id}:
 *     get:
 *       summary: Get one teammate (another tenant's teammate is 404)
 *       tags: [Teammates]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: Teammate }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     patch:
 *       summary: Update a teammate (any subset of the create fields; fallback pair stays together)
 *       tags: [Teammates]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { type: object, description: 'TeammateCreateSchema / TeammateUpdateSchema (BE-INCR-TEAMMATES §2.2)' }
 *       responses:
 *         '200': { description: Teammate updated }
 *         '400': { description: "Validation failed, ALCADA_INVALIDA or FERRAMENTA_INVALIDA" }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     delete:
 *       summary: Delete a teammate (soft-delete)
 *       tags: [Teammates]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: Teammate deleted }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
