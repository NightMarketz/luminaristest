/**
 * OpenAPI de /api/receivables.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/receivables:
 *     get:
 *       summary: List receivables for the unit (Contas a Receber, INCR-AR)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [OPEN, RECEIVING, RECEIVED, CANCELLED] } }
 *         - { in: query, name: counterpartyId, required: false, schema: { type: string }, description: 'BE-INCR-SUBLEDGER-FILTERS — filtra pela FK de contraparte; o snapshot customerName NÃO é casado' }
 *         - { in: query, name: dueFrom, required: false, schema: { type: string, format: date }, description: 'YYYY-MM-DD — início da faixa de vencimento, INCLUSIVO' }
 *         - { in: query, name: dueTo, required: false, schema: { type: string, format: date }, description: 'YYYY-MM-DD — fim da faixa de vencimento, INCLUSIVO' }
 *         - { in: query, name: q, required: false, schema: { type: string }, description: 'Substring em description OU documentNumber. LIKE do SQLite — dobra caixa em ASCII, não em acentuado; % e _ valem como curinga' }
 *         - { in: query, name: overdue, required: false, schema: { type: boolean }, description: 'Vencidos: dueDate < hoje E status em aberto. Vencer HOJE nao conta (espelha o aging)' }
 *         - { in: query, name: page, required: false, schema: { type: integer } }
 *         - { in: query, name: limit, required: false, schema: { type: integer } }
 *       responses:
 *         '200': { description: 'paginated receivables with their receipts' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *     post:
 *       summary: Create a receivable and book its recognition entry
 *       description: >-
 *         Books the recognition (debit 1.1.5 Clientes a Receber, credit the chosen revenue account)
 *         dated the issueDate (competência). On a synchronous posting failure the row is compensated
 *         (soft-delete). The fatura flows into the SourceDocument provenance seam. AR-formal is for
 *         manual customer invoices, not salon sales (already booked by the bridge).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CreateReceivableInput' }
 *       responses:
 *         '201': { description: 'the created receivable' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/receivables/reconcile:
 *     post:
 *       summary: Re-drive missing recognitions/receipts (D4 safety net)
 *       description: >-
 *         Idempotent maintenance pass that re-posts any missing recognition or receipt entry and
 *         finalizes a receivable stranded in RECEIVING after a crash between the ledger post and the
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
 *         '200': { description: 'counts of recognitions/receipts posted and receivables finalized' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/receivables/{id}:
 *     get:
 *       summary: Read one receivable with its receipts
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'the receivable and its receipts' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/receivables/{id}/receive:
 *     post:
 *       summary: Register a receipt (full or partial) and book the entry — alias of /settlements
 *       description: >-
 *         Closes the race with an atomic sum-CAS (OPEN or PARTIALLY_RECEIVED to RECEIVING,
 *         receivedCents plus amount, only when the remaining balance carries it), then books the
 *         receipt (debit the account for the method, credit 1.1.5) dated the effective credit date,
 *         and moves the receivable to RECEIVED (balance closed) or PARTIALLY_RECEIVED. Kept as the
 *         historical path; same service as POST /api/receivables/{id}/settlements.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RegisterReceiptInput' }
 *       responses:
 *         '201': { description: 'the registered receipt' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/receivables/{id}/cancel:
 *     post:
 *       summary: Cancel an open receivable (reverse the recognition)
 *       description: >-
 *         Reverses the recognition entry on the reversalDate (its own period gate) and flips the
 *         receivable to CANCELLED, freeing the business key. A received receivable must have its
 *         receipt cancelled first.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CancelReceivableInput' }
 *       responses:
 *         '200': { description: 'the cancelled receivable' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/receivables/{id}/settlements:
 *     post:
 *       summary: Register one settlement (partial or full) of a receivable
 *       description: >-
 *         BE-INCR-PARTIAL-SETTLEMENT (F-PS10 rota-irma, ACC-016) — mirror of the payables path. Any
 *         amount up to the remaining balance (amountCents minus receivedCents); N receipts per title,
 *         each posting its own JournalEntry (sourceId = receipt id). Audit
 *         receivable.settlement_registered carries receivedCentsAfter and remainingCents.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RegisterReceiptInput' }
 *       responses:
 *         '201': { description: 'the registered settlement (ReceivableReceipt row)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/receivables/{id}/settlements/{settlementId}/cancel:
 *     post:
 *       summary: Cancel one settlement among N (reverse it, give its amount back to the balance)
 *       description: >-
 *         Any receipt, any position (F-PS3). Reverses that receipt's entry, decrements receivedCents
 *         atomically and recomputes the status (OPEN when nothing remains received,
 *         PARTIALLY_RECEIVED otherwise). Refuses while another receipt is in flight.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: path, name: settlementId, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CancelReceiptInput' }
 *       responses:
 *         '200': { description: 'the cancelled settlement' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/receivables/{id}/receipts/{receiptId}/cancel:
 *     post:
 *       summary: Cancel a receipt (reverse the entry, give its amount back to the balance) — alias of /settlements/{settlementId}/cancel
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: path, name: receiptId, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CancelReceiptInput' }
 *       responses:
 *         '200': { description: 'the cancelled receipt' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
/**
 * @openapi
 * paths:
 *   /api/receivables/{receivableId}/charges:
 *     post:
 *       summary: Create a provider charge (boleto/Pix) for the open balance of a receivable (BE-INCR-PAYMENT-PROVIDER PR-2, P2-2)
 *       description: >-
 *         Valor = saldo em aberto relido na tx; conta Mercado Pago ACTIVE do escopo. Nenhum efeito no razão (PP-D5).
 *         Campos de juros/multa/desconto ou prazo do tipo errado ⇒ 400 (P2-12).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: receivableId, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CreateCollectionChargeInput' }
 *       responses:
 *         '201': { description: 'CollectionChargeView (PENDING, ou FAILED se o provedor recusou)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'CHARGE_RECEIVABLE_NOT_CHARGEABLE | CHARGE_LIVE_EXISTS | CHARGE_NOTHING_TO_CHARGE | PAYMENT_ACCOUNT_NOT_ACTIVE' }
 *         '502': { description: 'provider_credential_invalid | provider_unavailable (a cobrança fica CREATING e o job reenvia)' }
 *         '503': { description: 'payment_credential_key_missing' }
 *     get:
 *       summary: List the provider charges of a receivable (P2-15) — without payer data
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: receivableId, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'CollectionChargeView[]' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *   /api/receivables/{receivableId}/charges/payer-suggestion:
 *     get:
 *       summary: Suggest the payer from the last charge of the same counterparty (P2-11, F-PP-11 a1)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: receivableId, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'payer (parcial)' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
