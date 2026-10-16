/**
 * OpenAPI de /api/accounting/audit.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *
 *   # ─── AUDIT CHAIN (BRIEF-W1-A) ─────────────────────────────────────────────
 *
 *   /api/accounting/audit/verify-chain:
 *     get:
 *       summary: Verifica a integridade da cadeia de hash da trilha de auditoria (append-only), read-only
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200':
 *           description: Resultado da verificação da cadeia
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:
 *                     type: object
 *                     properties:
 *                       ok:            { type: boolean }
 *                       checkedEvents: { type: integer }
 *                       firstSeq:      { type: string, nullable: true, description: "bigint serializado como string" }
 *                       lastSeq:       { type: string, nullable: true, description: "bigint serializado como string" }
 *                       headHash:      { type: string, nullable: true }
 *                       failure:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           seq:    { type: string, description: "bigint serializado como string" }
 *                           reason:
 *                             type: string
 *                             enum: [MISSING_GENESIS, SEQ_GAP, PREV_HASH_MISMATCH, HASH_MISMATCH, HEAD_MISMATCH]
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 */
export {};
