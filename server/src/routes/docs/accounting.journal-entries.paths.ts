/**
 * OpenAPI de /api/accounting/journal-entries.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/journal-entries/{journalEntryId}/attachments:
 *     get:
 *       summary: List attachments for a journal entry
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path,  name: journalEntryId, required: true, schema: { type: string } }
 *         - { in: query, name: unitId,         required: true, schema: { type: string } }
 *       responses:
 *         '200':
 *           description: Attachment list
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data: { type: array, items: { $ref: '#/components/schemas/DocumentAttachment' } }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 */
export {};
