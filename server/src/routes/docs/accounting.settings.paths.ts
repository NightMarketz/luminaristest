/**
 * OpenAPI de /api/accounting/settings.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/settings:
 *     get:
 *       summary: Read the per-scope accounting settings (AccountingScopeSettings, 2026-09-15)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'unitId, bankChargeExpenseAccountId, bankChargeIncomeAccountId, depreciationExpenseAccountId, disposalGainAccountId, disposalLossAccountId, depreciationParteBAccountId, providerFeeExpenseAccountId, updatedAt' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     put:
 *       summary: Update the per-scope accounting settings (bank charge + fixed-asset accounts, F7 item 8 + BE-INCR-FIXED-ASSETS item 5/24)
 *       description: >-
 *         409: POLICY_APPROVAL_REQUIRED — escopo com contador responsável ativo; proponha em POST /api/accounting/policy-versions (F-POL-4 b)
 *         Account ids of this scope; the service validates existence, acceptsEntries and nature
 *         (Expense for the paid charge, Revenue for the received charge; the 2 fixed-asset gain/loss
 *         accounts have no fixed nature). The account CODES are the accountant decision (BRIEF F7 §5) —
 *         until configured, /confirm with chargeCents > 0 answers 400 charge_account_not_configured.
 *         depreciationParteBAccountId targets LalurParteBAccount, not Account (PR-3 consumer). null
 *         clears a field.
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
 *                 bankChargeExpenseAccountId:    { type: string, nullable: true }
 *                 bankChargeIncomeAccountId:     { type: string, nullable: true }
 *                 depreciationExpenseAccountId:  { type: string, nullable: true, description: 'D despesa de depreciação (item 5)' }
 *                 disposalGainAccountId:         { type: string, nullable: true, description: 'C ganho na baixa (item 5)' }
 *                 disposalLossAccountId:         { type: string, nullable: true, description: 'D perda na baixa (item 5)' }
 *                 depreciationParteBAccountId:   { type: string, nullable: true, description: 'conta LalurParteBAccount para a diferença contábil×fiscal (item 24, PR-3)' }
 *                 providerFeeExpenseAccountId:   { type: string, nullable: true, description: 'D tarifa do provedor de cobrança (Expense) — F5 PR-3, P3-11; sem ela, /confirm com feeCents > 0 dá 400 fee_account_not_configured' }
 *       responses:
 *         '200': { description: 'the updated settings view' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 */
export {};
