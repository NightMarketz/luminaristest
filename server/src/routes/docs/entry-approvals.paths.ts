/**
 * OpenAPI de /api/entry-approvals.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/entry-approvals/pending:
 *     get:
 *       summary: List entries awaiting approval (maker-checker queue, ADR-INCR-APPROVAL)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *         - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 200 } }
 *       responses:
 *         '200': { description: 'paginated PendingApproval entries with their legs' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/entry-approvals/drafts:
 *     post:
 *       summary: Create a draft journal entry with its legs (no number, no ledger impact yet)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CreateDraftEntryInput' }
 *       responses:
 *         '201': { description: 'the created Draft entry' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/entry-approvals/drafts/{id}:
 *     put:
 *       summary: Replace a draft entry content (edit after rejection)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UpdateDraftEntryInput' }
 *       responses:
 *         '200': { description: 'the updated Draft entry' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/entry-approvals/drafts/{id}/submit:
 *     post:
 *       summary: Submit a draft for approval (freezes the content hash, moves to PendingApproval)
 *       description: "409: version conflict (stale expectedVersion)"
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SubmitEntryInput' }
 *       responses:
 *         '200': { description: 'the submitted entry (PendingApproval)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/entry-approvals/{id}/approve:
 *     post:
 *       summary: Approve and post a submitted entry (checker; segregation of duties)
 *       description: >-
 *         409: version conflict (stale expectedVersion)
 *         Approves and posts atomically. The approver must NOT be the creator or submitter
 *         (dynamic SoD, server-side). Assigns the gapless entryNumber inside the tx, re-checks
 *         the period gate and the frozen content hash. Fails 403 on a SoD violation, 409 on a
 *         stale version.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApproveEntryInput' }
 *       responses:
 *         '200': { description: 'the Posted entry' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { description: 'SoD violation (approver is the creator or submitter)' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/entry-approvals/{id}/reject:
 *     post:
 *       summary: Reject a submitted entry back to Draft
 *       description: "409: version conflict (stale expectedVersion)"
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RejectEntryInput' }
 *       responses:
 *         '200': { description: 'the entry back in Draft' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 */
export {};
