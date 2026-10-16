/**
 * OpenAPI de /api/accounting/reconciliation.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/reconciliation/statements:
 *     post:
 *       summary: Import a bank statement (CSV/XLSX/OFX/CNAB) for a bank GL account
 *       description: 'Accepts CSV/XLSX (columns date,amountCents,description[,externalRef], signed integer cents), OFX (normalized from STMTTRN - DTPOSTED→date, TRNAMT→signed cents, NAME/MEMO→description, FITID→externalRef) or CNAB 240 (Segmento E extrato — DDMMAAAA→date, 18-digit value→signed cents by D/C indicator, histórico→description, document number→externalRef). Format is auto-detected. ALL-OR-NOTHING — any invalid row rejects the whole file; a multi-account OFX/CNAB and a CNAB 400 file are rejected. Re-import of the same file (sha256) is idempotent (200, nothing written). No ledger value is written.'
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               required: [unitId, glAccountId, periodStart, periodEnd, file]
 *               properties:
 *                 unitId:              { type: string }
 *                 glAccountId:         { type: string, description: bank GL account id (accounts.id) }
 *                 statementRef:        { type: string }
 *                 periodStart:         { type: string, format: date, description: YYYY-MM-DD }
 *                 periodEnd:           { type: string, format: date, description: YYYY-MM-DD }
 *                 openingBalanceCents: { type: integer }
 *                 closingBalanceCents: { type: integer }
 *                 format:              { type: string, enum: [mp_release], description: 'F5 PR-3 (G6): optional; empty = auto-detected. mp_release = Mercado Pago released-money report of the PaymentAccount on this GL (none ⇒ 409 release_report_no_payment_account); balances come only from the file (sending them ⇒ 400 release_report_balance_from_file); missing columns ⇒ 400 release_report_missing_columns; SOURCE_ID+DESCRIPTION already imported ⇒ 400 release_report_overlap' }
 *                 file:                { type: string, format: binary, description: CSV, XLSX, OFX, CNAB 240 or mp_release CSV }
 *       responses:
 *         '201': { description: Statement imported (created + staged lines) }
 *         '200': { description: Same file already imported (idempotent hit) }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '409': { description: 'release_report_no_payment_account — mp_release on a GL account without a Mercado Pago PaymentAccount' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     get:
 *       summary: List imported bank statements (paginated)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: page, required: false, schema: { type: integer, default: 1 } }
 *         - { in: query, name: limit, required: false, schema: { type: integer, default: 10, maximum: 100 } }
 *       responses:
 *         '200': { description: Statements + total }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/accounting/reconciliation/statements/{id}/lines:
 *     get:
 *       summary: List the lines of a statement (optional status filter)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [UNMATCHED, MATCHED, IGNORED] } }
 *       responses:
 *         '200': { description: Statement + lines (lineNumber asc) }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/reconciliation/statements/{id}:
 *     delete:
 *       summary: Soft-delete a statement (blocked while any match is active)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: Statement soft-deleted }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/reconciliation/statements/{id}/auto-match:
 *     post:
 *       summary: Run the deterministic auto-match over UNMATCHED lines (D6)
 *       description: Commits ONLY single-candidate lines (exact cents + direction, ±3-day window, entry Posted, no active match). 0 or >1 candidates leave the line pending. Idempotent by construction. May flip fully-matched entries Posted→Reconciled (derived, audited).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId]
 *               properties:
 *                 unitId: { type: string }
 *       responses:
 *         '200': { description: 'Summary: processed/matched/zeroCandidates/ambiguous' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/reconciliation/lines/{id}/suggestions:
 *     get:
 *       summary: Ranked match suggestions for one UNMATCHED line (|Δdays| asc, postingId asc)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: Candidates with deltaDays }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/reconciliation/lines/{id}/ignore:
 *     post:
 *       summary: Mark/unmark a line as IGNORED (e.g. a fee to be posted via /post)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, ignored]
 *               properties:
 *                 unitId:  { type: string }
 *                 ignored: { type: boolean }
 *       responses:
 *         '200': { description: Line status updated }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/reconciliation/matches:
 *     post:
 *       summary: Manual match — N postings ↔ 1 statement line (D3 aggregation)
 *       description: 'Aggregate invariant: Σ(posting side amounts) === |line.amountCents| (exact integer cents). Full in-tx gate per posting; may flip the entry Posted→Reconciled.'
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ManualMatch'
 *       responses:
 *         '201': { description: Matches created }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/reconciliation/matches/{id}/unmatch:
 *     post:
 *       summary: Soft-undo of an active match (trail preserved; may flip the entry back to Posted)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId]
 *               properties:
 *                 unitId: { type: string }
 *                 reason: { type: string, maxLength: 500 }
 *       responses:
 *         '200': { description: Match soft-undone }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/reconciliation/pending:
 *     get:
 *       summary: Pending report — UNMATCHED lines + bank postings with no active match (as-of)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: glAccountId, required: true, schema: { type: string } }
 *         - { in: query, name: from, required: false, schema: { type: string, format: date } }
 *         - { in: query, name: to, required: false, schema: { type: string, format: date } }
 *       responses:
 *         '200': { description: 'account + unmatchedLines + unmatchedPostings + totals (integer cents)' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
