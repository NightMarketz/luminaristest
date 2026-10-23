/**
 * OpenAPI de /api/accounting/profit-distributions (BE-INCR-IRRF-DISTRIBUICAO PR-2, BRIEF itens 10–21).
 * Um arquivo por feature (dono, 2026-10-16).
 * @openapi
 * components:
 *   schemas:
 *     ProfitDistributionInput:
 *       type: object
 *       required: [unitId, partnerId, evento, dataEvento, brutoCents, debitoAccountId, origemLucro]
 *       properties:
 *         unitId: { type: string, description: 'Unit of the journal entry' }
 *         partnerId: { type: string }
 *         evento: { type: string, enum: [CREDITO, PAGAMENTO, EMPREGO, ENTREGA], description: 'First event triggers the withholding (F-IRD-4)' }
 *         dataEvento: { type: string, format: date }
 *         brutoCents: { type: integer, minimum: 1 }
 *         debitoAccountId: { type: string, description: 'Equity: retained earnings or a reserve' }
 *         contraAccountId: { type: string, description: 'Forbidden in CREDITO (profile account); Asset in PAGAMENTO/ENTREGA; Equity (capital) in EMPREGO' }
 *         origemLucro: { type: string, enum: [CORRENTE, TRANSICAO] }
 *         anoResultado: { type: integer, description: 'TRANSICAO only, ≤ 2025' }
 *         aprovadoEm: { type: string, format: date, description: 'TRANSICAO only, ≤ the TRANSICAO_APROVACAO_ATE legal parameter' }
 *         atoSourceDocumentId: { type: string, description: 'TRANSICAO only: the approval act attached' }
 * paths:
 *   /api/accounting/profit-distributions:
 *     post:
 *       summary: Record a profit distribution with the IRRF of Law 9.250 art. 6-A, then post it
 *       description: >-
 *         Above BRL 50,000 in the month for the same individual (all units of the company), 10% on the month total;
 *         transition profit stays out of the base but counts for the limit (F-IRD-6). The event is saved as
 *         PENDING_POST and posted right away (D debit gross / C counterpart net / C IRRF payable); if posting fails
 *         the event stays PENDING_POST (reconcile in /{id}/lancamento). Closed period → ACCOUNTING_PERIOD_NOT_OPEN and
 *         nothing is saved. Non-resident partner → 400 SOCIO_NAO_RESIDENTE_FORA_DO_ESCOPO.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ProfitDistributionInput' }
 *       responses:
 *         '201': { description: 'ProfitDistributionView (status POSTED or PENDING_POST, memoria, avisoSaldoLucro)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { description: 'Partner, account or approval act not found in the scope' }
 *         '422': { description: 'RETENCAO_EXCEDE_PAGAMENTO (details.brutoMinimoCents) or ACCOUNTING_PERIOD_NOT_OPEN' }
 *
 *   /api/accounting/profit-distributions/preview:
 *     post:
 *       summary: Preview a profit distribution (nothing is saved)
 *       description: >-
 *         Returns the month sum, base, IRRF due, already withheld, the IRRF of this event, the ceiling without
 *         withholding, the minimum gross when the event does not cover the IRRF, and a suggestion (F-IRD-5R).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ProfitDistributionInput' }
 *       responses:
 *         '200': { description: 'ProfitDistributionPreviewView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { description: 'Partner, account or approval act not found in the scope' }
 *
 *   /api/accounting/profit-distributions/irrf:
 *     get:
 *       summary: Monthly DARF 1841 summary of the IRRF on profits
 *       description: Total withheld in the company, events with withholding and due date (last business day of the 2nd ten-day period of the next month).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: competencia, required: true, schema: { type: string, example: '2026-03' } }
 *       responses:
 *         '200': { description: '{ competencia, codigoReceita: 1841, totalCents, vencimento, eventos }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting/profit-distributions/{id}:
 *     get:
 *       summary: Read one profit distribution event
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'ProfitDistributionView' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/profit-distributions/{id}/lancamento:
 *     post:
 *       summary: Reconcile the journal entry of a pending distribution (idempotent)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { type: object, required: [unitId], properties: { unitId: { type: string } } }
 *       responses:
 *         '200': { description: 'ProfitDistributionView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '422': { description: 'ACCOUNTING_PERIOD_NOT_OPEN' }
 *
 *   /api/accounting/profit-distributions/{id}/cancel:
 *     post:
 *       summary: Cancel the last posted distribution of the partner in the month (F-IRD-8) and reverse its entry
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
 *                 motivo: { type: string, maxLength: 500 }
 *       responses:
 *         '200': { description: 'ProfitDistributionView (CANCELLED)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'NAO_E_O_ULTIMO_DO_MES (with the id to cancel first) or DISTRIBUICAO_NAO_POSTADA' }
 *         '422': { description: 'ACCOUNTING_PERIOD_NOT_OPEN' }
 */
export {};
