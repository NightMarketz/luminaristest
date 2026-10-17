/**
 * OpenAPI de /api/chat-messages.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   # ─── CHAT MESSAGES ──────────────────────────────────────────────────────
 *   /api/chat-messages:
 *     get:
 *       summary: List chat messages (optionally filtered by instance)
 *       tags: [ChatMessages]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200': { description: List of messages }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *     post:
 *       summary: Create a new chat message
 *       tags: [ChatMessages]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { type: object }
 *       responses:
 *         '201': { description: Message created }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 */
export {};
