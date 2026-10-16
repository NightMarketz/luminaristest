/**
 * OpenAPI de /api/accounting/attachments.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   # ─── ACCOUNTING ATTACHMENTS / EVIDENCE (BE-INCR-5) ───────────────────────
 *   /api/accounting/attachments:
 *     post:
 *       summary: Upload documentary evidence to a journal entry
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               required: [unitId, targetId, file]
 *               properties:
 *                 unitId:     { type: string }
 *                 targetType: { type: string, enum: [JOURNAL_ENTRY], default: JOURNAL_ENTRY }
 *                 targetId:   { type: string, description: journal entry id }
 *                 file:       { type: string, format: binary }
 *       responses:
 *         '201':
 *           description: Attachment metadata (binary persisted to disk)
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:    { $ref: '#/components/schemas/DocumentAttachment' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '413': { description: File too large }
 *         '415': { description: Unsupported media type / content mismatch }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *
 *   /api/accounting/attachments/{id}:
 *     get:
 *       summary: Download an attachment binary by id
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path,  name: id,     required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200':
 *           description: File stream
 *           content:
 *             application/octet-stream:
 *               schema: { type: string, format: binary }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *     delete:
 *       summary: Soft-delete an attachment (binary retained for audit)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path,  name: id,     required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200':
 *           description: Soft-deleted
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data: { type: object, properties: { ok: { type: boolean, example: true } } }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 */
export {};
