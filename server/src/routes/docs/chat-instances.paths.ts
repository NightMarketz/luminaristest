/**
 * OpenAPI de /api/chat-instances.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   # ─── CHAT INSTANCES ─────────────────────────────────────────────────────
 *   /api/chat-instances:
 *     get:
 *       summary: List chat instances for the current user
 *       tags: [ChatInstances]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: query
 *           name: page
 *           schema: { type: integer, default: 1 }
 *         - in: query
 *           name: limit
 *           schema: { type: integer, default: 10 }
 *         - in: query
 *           name: type
 *           schema: { type: string, enum: [DOCUMENT, GENERIC] }
 *       responses:
 *         '200': { description: List of chat instances }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *     post:
 *       summary: Create a new chat instance
 *       tags: [ChatInstances]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { type: object }
 *       responses:
 *         '201': { description: Chat instance created }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/chat-instances/get-or-create:
 *     post:
 *       summary: Get an existing chat instance by widget ID or create one
 *       tags: [ChatInstances]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [widgetInstanceId, type]
 *               properties:
 *                 widgetInstanceId: { type: string }
 *                 type: { type: string, enum: [DOCUMENT, GENERIC] }
 *       responses:
 *         '200': { description: Existing or newly created chat instance }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/chat-instances/{id}:
 *     put:
 *       summary: Update a chat instance
 *       tags: [ChatInstances]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string, format: cuid }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { type: object }
 *       responses:
 *         '200': { description: Updated instance }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *     delete:
 *       summary: Delete a chat instance
 *       tags: [ChatInstances]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string, format: cuid }
 *       responses:
 *         '200': { description: Instance deleted }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 */
export {};
