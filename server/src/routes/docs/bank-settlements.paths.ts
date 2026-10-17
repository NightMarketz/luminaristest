/**
 * OpenAPI de /api/bank-settlements.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/bank-settlements:
 *     get:
 *       summary: List bank settlement proposals (BE-INCR-BANK-SETTLEMENT, nó F7)
 *       description: >-
 *         Offset-paginated listing of PROPOSED settlements built by /scan from UNMATCHED statement
 *         lines. Each item carries the line (date, signed amountCents, description) and the title
 *         (open balance RECOMPUTED on read, never persisted). Only /confirm produces a financial
 *         effect (cédula 10/09 resposta 20).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: statementId, required: false, schema: { type: string } }
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [PENDING, CONFIRMING, CONFIRMED, REJECTED, FAILED, STALE] } }
 *         - { in: query, name: page, required: false, schema: { type: integer, default: 1 } }
 *         - { in: query, name: limit, required: false, schema: { type: integer, default: 20, maximum: 100 } }
 *       responses:
 *         '200': { description: 'items (BankSettlementItemView[] — incl. feeCents: provider fee in integer cents, 0 = bank item; feeEntryId: provider.fee entry id or null), total, page, limit' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/bank-settlements/scan:
 *     post:
 *       summary: Scan a statement's UNMATCHED lines into settlement proposals (F-F7-1 a)
 *       description: >-
 *         For each UNMATCHED line of the statement, deterministic candidacy (BRIEF item 3): sign
 *         picks the side (negative = Payable, positive = Receivable), due date within [line − 30d,
 *         line + 5d], |line| == open balance (exact), < open (partial, #307) or ≤ open + 20% cap
 *         (charge, F-F7-5 a). Exactly ONE candidate creates a PENDING item; 0 or >1 are counted as
 *         none/ambiguous and skipped. Idempotent: a live item on the line is not duplicated. PENDING
 *         items whose line/title changed since are marked STALE (item 10).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, statementId]
 *               properties:
 *                 unitId: { type: string }
 *                 statementId: { type: string }
 *       responses:
 *         '200': { description: 'created, skippedExisting, ambiguous, none, stale' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/bank-settlements/{id}/confirm:
 *     post:
 *       summary: Confirm a proposal — the ONLY financial effect (items 6–8, F-F7-3/4 a)
 *       description: >-
 *         CAS PENDING→CONFIRMING closes the race (two confirms = one effect). Authoritative
 *         pre-check in a read transaction BEFORE any effect: item PENDING, line UNMATCHED with no
 *         active match, statement active, title balance re-read ≥ proposedCents, the account the
 *         method resolves to must be the statement's bank account, and — when chargeCents > 0 —
 *         a charge account configured (PUT /api/accounting/settings) and the line's period OPEN.
 *         Any failure = 400 with no effect. Then idempotent steps with state saved on the item:
 *         (i) AP/AR registerPayment/registerReceipt (their own claim→book→finalize protocol),
 *         (ii) bank.charge entry when chargeCents > 0, (ii-b) provider.fee entry when feeCents > 0
 *         (F5 PR-3, P3-8: D providerFeeExpenseAccountId / C PaymentAccount GL), (iii) manualMatch of the
 *         statement-account legs (signed Σ == line), (iv) CONFIRMED. Failure in (ii)/(iii) → FAILED with the ids kept.
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
 *               required: [unitId, method]
 *               properties:
 *                 unitId: { type: string }
 *                 method: { type: string, enum: [Cash, Pix, TED, Boleto, ProviderBalance], description: 'closed map PAYMENT_METHOD_ACCOUNTS — must resolve to the statement bank account. ProviderBalance (F5 PR-3, P3-9): only on a PaymentAccount statement (ACTIVE, same GL) for a RECEIVABLE — else 400 provider_balance_requires_payment_account' }
 *       responses:
 *         '200': { description: 'BankSettlementItemView (status CONFIRMED)' }
 *         '400': { description: 'pre-check failed (line_not_unmatched | title_not_open | title_balance | method_account_mismatch | charge_account_not_configured | fee_account_not_configured | provider_balance_requires_payment_account | period_not_open) or item not PENDING' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/bank-settlements/{id}/reject:
 *     post:
 *       summary: Reject a proposal (item 5) — no accounting effect
 *       description: PENDING → REJECTED with the operator reason (masked in the audit trail). The line stays UNMATCHED and eligible for manualMatch.
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
 *               required: [unitId, reason]
 *               properties:
 *                 unitId: { type: string }
 *                 reason: { type: string, maxLength: 500 }
 *       responses:
 *         '200': { description: 'BankSettlementItemView (status REJECTED)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/bank-settlements/{id}/retry:
 *     post:
 *       summary: Retry a FAILED confirmation from the first step without a saved id (item 9)
 *       description: FAILED → CONFIRMING → re-runs (i)–(iv) skipping steps whose id is already saved (settlementId, chargeEntryId) — never a second payment. CONFIRMED/REJECTED/PENDING → 400.
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
 *               required: [unitId, method]
 *               properties:
 *                 unitId: { type: string }
 *                 method: { type: string, enum: [Cash, Pix, TED, Boleto, ProviderBalance], description: "ProviderBalance só no caminho do F7 (P3-9)" }
 *       responses:
 *         '200': { description: 'BankSettlementItemView (status CONFIRMED)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 */
export {};
