/**
 * OpenAPI de /api/reconcile-pending.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/reconcile-pending:
 *     get:
 *       summary: List the reconcile pending-items table (BE-INCR-RECONCILE-PENDING, nó C7)
 *       description: >-
 *         Keyset-paginated listing of items that fell into `failed` or `blocked` in the
 *         accountingSyncReconcile job and were captured instead of relying on the trailing
 *         watermark (Fork 1/2). `cursor` is the `id` of the last item of the previous page.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: reasonCode, required: false, schema: { type: string, enum: [FAILED, ACCOUNTING_PERIOD_NOT_OPEN, MAX_CENTS_EXCEEDED, OPENING_ENTRY_MISSING, MISSING_PAID_WITH_PACKAGE_ID, NO_MAPPER_FOR_UNIT, PACKAGE_CONSUMPTION_PENDING, PACKAGE_ORIGIN_REVERSED, PACKAGE_EXPIRY_NFSE_PENDING, UNKNOWN_EVENT_KEY] } }
 *         - { in: query, name: includeResolved, required: false, schema: { type: boolean }, description: 'default false — só pendentes' }
 *         - { in: query, name: cursor, required: false, schema: { type: string } }
 *         - { in: query, name: limit, required: false, schema: { type: integer } }
 *       responses:
 *         '200': { description: 'items (ReconcilePendingItemView[]) + nextCursor (null quando não há mais páginas)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/reconcile-pending/rescan:
 *     post:
 *       summary: Re-drive unresolved pending items (Fork 3-b, checklist item 6)
 *       description: >-
 *         Re-executes SÓ os itens com resolvedAt IS NULL do escopo (ou o subconjunto `ids`),
 *         reusando o mesmo book/sync/reverse de cada passada original. Um item poison
 *         (MAX_CENTS_EXCEEDED) é retentado normalmente e permanece pendente — nunca lança.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId]
 *               properties:
 *                 unitId: { type: string }
 *                 ids: { type: array, items: { type: string }, description: 'vazio/ausente = todos os não resolvidos do escopo' }
 *       responses:
 *         '200': { description: 'attempted, resolved, stillPending' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 */
export {};
