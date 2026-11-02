/**
 * OpenAPI de /api/accounting/data-exchange.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *
 *   # ─── ACCOUNTING DATA EXCHANGE (BE-INCR-6) ───────────────────────────────
 *
 *   /api/accounting/data-exchange/exports:
 *     post:
 *       summary: Export a report or blank import template to CSV/XLSX
 *       description: Renders read-only report data (trial balance, ledger, BP, DRE, bank reconciliation, entry sample) or a blank import template; persists the artifact and returns a job. Download via /jobs/{jobId}/download.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [kind, format, unitId]
 *               properties:
 *                 kind:         { type: string, enum: [EXPORT_TRIAL_BALANCE, EXPORT_GENERAL_LEDGER, EXPORT_BALANCE_SHEET, EXPORT_INCOME_STATEMENT, EXPORT_TEMPLATE, EXPORT_BANK_RECONCILIATION, EXPORT_ENTRY_SAMPLE, EXPORT_TAX_ASSESSMENT_MEMO, EXPORT_ISS_BY_COMPETENCE, EXPORT_IBS_CBS_MEMO, EXPORT_ECONOMIA_FISCAL] }
 *                 format:       { type: string, enum: [csv, xlsx] }
 *                 unitId:       { type: string }
 *                 asOf:         { type: string, description: 'YYYY-MM-DD — required for BP/DRE; optional for EXPORT_TRIAL_BALANCE (balances as-of that date instead of accumulated-to-date)' }
 *                 accountCode:  { type: string, description: 'EXPORT_GENERAL_LEDGER only. When present, exports one account (optionally windowed by periodStart/periodEnd). When absent, exports the general ledger — every account with a leg in [periodStart, periodEnd] (periodStart/periodEnd then required)' }
 *                 periodStart:  { type: string, description: 'YYYY-MM-DD — EXPORT_GENERAL_LEDGER (optional; window), EXPORT_BANK_RECONCILIATION, EXPORT_ENTRY_SAMPLE, EXPORT_TAX_ASSESSMENT_MEMO, EXPORT_ISS_BY_COMPETENCE, EXPORT_IBS_CBS_MEMO and EXPORT_ECONOMIA_FISCAL (all REQUIRED) only (400 for any other kind). Must be given together with periodEnd (never just one — 400 otherwise)' }
 *                 periodEnd:    { type: string, description: 'YYYY-MM-DD — same kinds/rules as periodStart. >= periodStart' }
 *                 templateKind: { type: string, enum: [IMPORT_CHART_OF_ACCOUNTS, IMPORT_OPENING_BALANCES, IMPORT_JOURNAL_ENTRIES], description: 'required for EXPORT_TEMPLATE' }
 *                 perAccount:   { type: integer, minimum: 1, maximum: 50, description: 'EXPORT_ENTRY_SAMPLE only (400 for any other kind). Max legs sampled per account, default 5 when omitted.' }
 *                 seed:         { type: string, minLength: 1, maxLength: 64, description: 'EXPORT_ENTRY_SAMPLE only (required for it; 400 for any other kind). Deterministic sampling seed — same seed + same data = same sample.' }
 *       responses:
 *         '201':
 *           description: Export job created
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:    { $ref: '#/components/schemas/DataExchangeJob' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/data-exchange/jobs:
 *     get:
 *       summary: List data-exchange jobs (paginated), with supersedesJobId/supersededByJobId
 *       description: >-
 *         BE-INCR-FIXED-ASSETS PR-4 (item 23, F-FA15 a) — shape compartilhado com
 *         FE-INCR-REVIEW/FE-INCR-DELIVERY: quem mergear primeiro cria esta rota, o segundo
 *         estende. `supersededByJobId` é derivado por consulta inversa (nunca coluna própria).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: direction, schema: { type: string, enum: [IMPORT, EXPORT] } }
 *         - { in: query, name: kind, schema: { type: string } }
 *         - { in: query, name: status, schema: { type: string } }
 *         - { in: query, name: year, schema: { type: integer } }
 *         - { in: query, name: page, schema: { type: integer, default: 1 } }
 *         - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       responses:
 *         '200':
 *           description: Paginated list
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:
 *                     type: object
 *                     properties:
 *                       items:
 *                         type: array
 *                         items:
 *                           allOf:
 *                             - { $ref: '#/components/schemas/DataExchangeJob' }
 *                             - type: object
 *                               properties:
 *                                 supersedesJobId:   { type: string, nullable: true }
 *                                 supersededByJobId: { type: string, nullable: true }
 *                       total: { type: integer }
 *                       page:  { type: integer }
 *                       limit: { type: integer }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/data-exchange/jobs/{jobId}/waive-ecf-rectification:
 *     post:
 *       summary: Waive the ECF-rectification requirement a substitute ECD recorded on itself
 *       description: >-
 *         BE-INCR-FIXED-ASSETS PR-4 (item 22). Idempotent: a 2nd call over an already-waived job
 *         returns the same job without re-emitting the audit event.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: jobId, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, justification]
 *               properties:
 *                 unitId:        { type: string }
 *                 justification: { type: string, minLength: 20 }
 *       responses:
 *         '200':
 *           description: Job with the waiver recorded
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:    { $ref: '#/components/schemas/DataExchangeJob' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/data-exchange/jobs/{jobId}:
 *     get:
 *       summary: Get a data-exchange job summary
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: jobId, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: ownerUserId, required: false, schema: { type: string }, description: "GOV-CONTADOR: dono que o contador responsavel atende; ausente = escopo do proprio usuario; sem atribuicao ACTIVE do par = 403 ACCOUNTANT_NOT_ASSIGNED" }
 *       responses:
 *         '200':
 *           description: Job summary
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:    { $ref: '#/components/schemas/DataExchangeJob' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/data-exchange/jobs/{jobId}/download:
 *     get:
 *       summary: Download a data-exchange artifact (CSV/XLSX stream)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: jobId, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: ownerUserId, required: false, schema: { type: string }, description: "GOV-CONTADOR: dono que o contador responsavel atende; ausente = escopo do proprio usuario; sem atribuicao ACTIVE do par = 403 ACCOUNTANT_NOT_ASSIGNED" }
 *       responses:
 *         '200':
 *           description: Artifact stream
 *           content:
 *             application/octet-stream:
 *               schema: { type: string, format: binary }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/data-exchange/imports:
 *     post:
 *       summary: Upload + validate a CSV/XLSX import (chart, opening balances, or journal entries)
 *       description: Parses and per-row validates the file, staging a VALIDATED job. Does NOT write ledger data — call /jobs/{jobId}/commit to persist. Preview rows via /jobs/{jobId}/rows.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               required: [kind, unitId, file]
 *               properties:
 *                 kind:   { type: string, enum: [IMPORT_CHART_OF_ACCOUNTS, IMPORT_OPENING_BALANCES, IMPORT_JOURNAL_ENTRIES] }
 *                 unitId: { type: string }
 *                 file:   { type: string, format: binary, description: CSV or XLSX }
 *       responses:
 *         '201':
 *           description: Import validated and staged
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:    { $ref: '#/components/schemas/DataExchangeJob' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/data-exchange/jobs/{jobId}/rows:
 *     get:
 *       summary: List import rows (preview + error report)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: jobId, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [VALID, INVALID, COMMITTED, SKIPPED] } }
 *       responses:
 *         '200':
 *           description: Rows
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:    { type: array, items: { type: object } }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/data-exchange/jobs/{jobId}/commit:
 *     post:
 *       summary: Commit a staged import (writes accounts / journal entries via posting services)
 *       description: Commits VALID rows through createAccount/postEntry (authoritative period gate + balance re-checked in-tx). Per-entry atomic, partial success. Idempotent — already-committed rows are skipped.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: jobId, required: true, schema: { type: string } }
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
 *         '200':
 *           description: Commit result (job with committedRows)
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:    { $ref: '#/components/schemas/DataExchangeJob' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 */
export {};
