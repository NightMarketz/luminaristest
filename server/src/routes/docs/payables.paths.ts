/**
 * OpenAPI de /api/payables.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/payables:
 *     get:
 *       summary: List payables for the unit (Contas a Pagar, INCR-AP)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [OPEN, PAYING, PAID, CANCELLED] } }
 *         - { in: query, name: counterpartyId, required: false, schema: { type: string }, description: 'BE-INCR-SUBLEDGER-FILTERS — filtra pela FK de contraparte; o snapshot supplierName NÃO é casado' }
 *         - { in: query, name: dueFrom, required: false, schema: { type: string, format: date }, description: 'YYYY-MM-DD — início da faixa de vencimento, INCLUSIVO' }
 *         - { in: query, name: dueTo, required: false, schema: { type: string, format: date }, description: 'YYYY-MM-DD — fim da faixa de vencimento, INCLUSIVO' }
 *         - { in: query, name: q, required: false, schema: { type: string }, description: 'Substring em description OU documentNumber. LIKE do SQLite — dobra caixa em ASCII, não em acentuado; % e _ valem como curinga' }
 *         - { in: query, name: overdue, required: false, schema: { type: boolean }, description: 'Vencidos: dueDate < hoje E status em aberto. Vencer HOJE nao conta (espelha o aging)' }
 *         - { in: query, name: page, required: false, schema: { type: integer } }
 *         - { in: query, name: limit, required: false, schema: { type: integer } }
 *       responses:
 *         '200': { description: 'paginated payables with their payments' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *     post:
 *       summary: Create a payable and book its recognition entry
 *       description: >-
 *         Books the recognition (debit the chosen expense account, credit 2.1.2 Fornecedores a
 *         Pagar) dated the issueDate (competência). On a synchronous posting failure the row is
 *         compensated (soft-delete). The nota flows into the SourceDocument provenance seam.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CreatePayableInput' }
 *       responses:
 *         '201': { description: 'the created payable' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/payables/reconcile:
 *     post:
 *       summary: Re-drive missing recognitions/settlements (D4 safety net)
 *       description: >-
 *         Idempotent maintenance pass that re-posts any missing recognition or settlement entry
 *         and finalizes a payable stranded in PAYING after a crash between the ledger post and the
 *         finalize step.
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
 *       responses:
 *         '200': { description: 'counts of recognitions/settlements posted and payables finalized' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/payables/{id}:
 *     get:
 *       summary: Read one payable with its payments
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'the payable and its payments' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/payables/{id}/pay:
 *     post:
 *       summary: Register a payment (full or partial) and book the settlement — alias of /settlements
 *       description: >-
 *         Closes the race with an atomic sum-CAS (OPEN or PARTIALLY_PAID to PAYING, paidCents plus
 *         amount, only when the remaining balance carries it), then books the settlement (debit
 *         2.1.2, credit the account for the method) dated the effective debit date, and moves the
 *         payable to PAID (balance closed) or PARTIALLY_PAID. Kept as the historical path of the
 *         full payment; same service as POST /api/payables/{id}/settlements (BE-INCR-PARTIAL-SETTLEMENT).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RegisterPaymentInput' }
 *       responses:
 *         '201': { description: 'the registered payment' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/payables/{id}/cancel:
 *     post:
 *       summary: Cancel an open payable (reverse the recognition)
 *       description: >-
 *         Reverses the recognition entry on the reversalDate (its own period gate) and flips the
 *         payable to CANCELLED, freeing the business key. A paid payable must have its payment
 *         cancelled first.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CancelPayableInput' }
 *       responses:
 *         '200': { description: 'the cancelled payable' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/payables/{id}/settlements:
 *     post:
 *       summary: Register one settlement (partial or full) of a payable
 *       description: >-
 *         BE-INCR-PARTIAL-SETTLEMENT (F-PS10 rota-irma, ACC-016). Any amount up to the remaining
 *         balance (amountCents minus paidCents); N settlements per title. Atomic sum-CAS closes the
 *         race, each settlement posts its own JournalEntry (sourceId = settlement id), and the title
 *         moves to PARTIALLY_PAID or PAID by balance. Audit payable.settlement_registered carries
 *         paidCentsAfter and remainingCents.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RegisterPaymentInput' }
 *       responses:
 *         '201': { description: 'the registered settlement (PayablePayment row)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/payables/{id}/settlements/{settlementId}/cancel:
 *     post:
 *       summary: Cancel one settlement among N (reverse it, give its amount back to the balance)
 *       description: >-
 *         Any settlement, any position (F-PS3). Reverses that settlement's entry, decrements
 *         paidCents atomically and recomputes the status (OPEN when nothing remains paid,
 *         PARTIALLY_PAID otherwise). Refuses while another settlement is in flight.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: path, name: settlementId, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CancelPaymentInput' }
 *       responses:
 *         '200': { description: 'the cancelled settlement' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/payables/{id}/payments/{paymentId}/cancel:
 *     post:
 *       summary: Cancel a payment (reverse the settlement, give its amount back to the balance) — alias of /settlements/{settlementId}/cancel
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: path, name: paymentId, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CancelPaymentInput' }
 *       responses:
 *         '200': { description: 'the cancelled payment' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
