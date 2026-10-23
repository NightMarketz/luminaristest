/**
 * OpenAPI de /api/accounting/jcp (BE-INCR-IRRF-DISTRIBUICAO PR-3, BRIEF itens 22–26).
 * Um arquivo por feature (dono, 2026-10-16).
 * @openapi
 * components:
 *   schemas:
 *     JcpPreviewInput:
 *       type: object
 *       required: [unitId, anoCalendario, periodo, dataCredito, forma, totalCents]
 *       properties:
 *         unitId: { type: string, description: 'Unit of the ledger read and of the future entry' }
 *         anoCalendario: { type: integer, minimum: 2026 }
 *         periodo: { type: string, enum: [T01, T02, T03, T04, A00], description: 'Quarterly real profit uses T0n; annual uses A00' }
 *         dataCredito: { type: string, format: date, description: 'Inside the period (L-IRD-3)' }
 *         forma: { type: string, enum: [DESPESA, PL] }
 *         totalCents: { type: integer, minimum: 1 }
 *         debitoPlAccountId: { type: string, description: 'PL only: the equity account debited instead of the expense' }
 *         rateio:
 *           type: array
 *           description: 'Optional split per partner (default: by share); only partners in force; must add up to totalCents'
 *           items:
 *             type: object
 *             required: [partnerId, brutoCents]
 *             properties:
 *               partnerId: { type: string }
 *               brutoCents: { type: integer, minimum: 0 }
 * paths:
 *   /api/accounting/jcp/preview:
 *     post:
 *       summary: Preview interest on equity (JCP) — TJLP pro rata die base, deductible limit, split and IRRF (nothing is saved)
 *       description: >-
 *         Real profit only (400 JCP_SO_NO_LUCRO_REAL). Base = daily balance of the mapped equity accounts (end of the
 *         previous day) × monthly TJLP ÷ days of the month, from the start of the period to dataCredito. Limit =
 *         min(TJLP interest, max(50% of the period profit before JCP and IRPJ, 50% of retained earnings + profit
 *         reserves at the start of the period)). IRRF 17.5% per partner. A total above the limit is accepted and shows
 *         excessoIndedutivelCents. Errors: PERIODO_INCOMPATIVEL_COM_A_FORMA, DATA_CREDITO_FORA_DO_PERIODO,
 *         SOMA_PARTICIPACOES_INVALIDA, SOCIO_NAO_RESIDENTE_FORA_DO_ESCOPO, JCP_MAPA_PL_NAO_CONFIGURADO, RATEIO_INVALIDO,
 *         PARAMETRO_LEGAL_AUSENTE (no TJLP on some day).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/JcpPreviewInput' }
 *       responses:
 *         '200': { description: 'JcpPreviewView (faixas, limits, alocacoes, lalurPrevisto, avisos)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { description: 'Equity account (PL form) not found in the unit' }
 *
 *   /api/accounting/jcp:
 *     post:
 *       summary: Confirm interest on equity (JCP), post it and record the e-Lalur/e-Lacs Part A adjustments
 *       description: >-
 *         Body = the preview body + previaSha256 returned by the preview. The calculation is redone inside the
 *         transaction: a different hash → 409 PREVIA_DESATUALIZADA; another live JCP in the period → 409
 *         JCP_JA_CONFIRMADO_NO_PERIODO. Then posts (DESPESA: D JCP expense / C JCP payable net / C IRRF payable; PL: D the
 *         chosen equity account instead of the expense) and records the system Part A lines (PL: exclusion of
 *         min(total, limit); DESPESA: addition of the excess). If posting fails the calculation stays PENDING_POST
 *         (reconcile in /{id}/lancamento). Closed period → ACCOUNTING_PERIOD_NOT_OPEN and nothing is saved.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/JcpPreviewInput'
 *                 - type: object
 *                   required: [previaSha256]
 *                   properties:
 *                     previaSha256: { type: string, description: 'sha256 hex returned by /jcp/preview' }
 *       responses:
 *         '201': { description: 'JcpView (status POSTED or PENDING_POST, entryId, lalurEntryIds, alocacoes)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '409': { description: 'PREVIA_DESATUALIZADA or JCP_JA_CONFIRMADO_NO_PERIODO' }
 *         '422': { description: 'ACCOUNTING_PERIOD_NOT_OPEN' }
 *
 *   /api/accounting/jcp/irrf:
 *     get:
 *       summary: Monthly DARF 5706 summary of the IRRF on interest on equity, one DARF per ten-day period of the credit
 *       description: Due date = 3rd business day after the ten-day period of the credit date (Law 11.196 art. 70 I b 1).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: competencia, required: true, schema: { type: string, example: '2026-03' } }
 *       responses:
 *         '200': { description: '{ competencia, codigoReceita: 5706, totalCents, darfs: [{ decendio, vencimento, totalCents, calculos }] }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting/jcp/{id}:
 *     get:
 *       summary: Read one confirmed JCP calculation
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'JcpView' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/jcp/{id}/lancamento:
 *     post:
 *       summary: Reconcile the journal entry and the Part A lines of a JCP calculation (idempotent)
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
 *         '200': { description: 'JcpView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '422': { description: 'ACCOUNTING_PERIOD_NOT_OPEN' }
 *
 *   /api/accounting/jcp/{id}/cancel:
 *     post:
 *       summary: Cancel a JCP calculation — reverses the entry and archives the system Part A lines
 *       description: A JCP already paid (any debit in the JCP payable account dated on or after the credit date, other than its own entry and reversal) → 409 JCP_JA_PAGO.
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
 *         '200': { description: 'JcpView (CANCELLED)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'JCP_JA_PAGO or JCP_NAO_POSTADO' }
 *         '422': { description: 'ACCOUNTING_PERIOD_NOT_OPEN' }
 */
export {};
