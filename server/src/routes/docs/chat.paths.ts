/**
 * OpenAPI de /api/chat.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   # ─── CHAT ───────────────────────────────────────────────────────────────
 *   /api/chat:
 *     post:
 *       summary: Generate an AI chat completion
 *       tags: [Chat]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ragMode: { type: string, enum: [DESCRITIVO, RAPIDO], description: 'RAG (emenda 07/11, item 15a): DESCRITIVO numera os trechos e devolve citations; RAPIDO (padrão) só a resposta' }
 *       responses:
 *         '200': { description: AI-generated response }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '429': { description: Rate limit exceeded (20 req/min per user) }
 */
export {};
