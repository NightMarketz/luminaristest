/**
 * OpenAPI de /api/payment-accounts.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/payment-accounts:
 *     get:
 *       summary: List the payment-provider accounts of a scope (BE-INCR-PAYMENT-PROVIDER PR-1)
 *       description: >-
 *         Só linhas vivas. A credencial nunca é devolvida - a projeção mostra credentialSetAt e
 *         accessTokenLast4 (PP-D7).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'PaymentAccountView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *     post:
 *       summary: Create a payment-provider account (status DRAFT, sem credencial)
 *       description: >-
 *         glAccountId tem de ser folha do escopo e fica imutável depois de criada.
 *         credentialSource OAUTH responde 400 credential_source_not_supported.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CreatePaymentAccountInput' }
 *       responses:
 *         '201': { description: 'PaymentAccountView criada (DRAFT)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/payment-accounts/{id}:
 *     get:
 *       summary: Read a payment-provider account
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'PaymentAccountView' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     patch:
 *       summary: Update label and/or status (ACTIVE to DISABLED, DISABLED to ACTIVE)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UpdatePaymentAccountInput' }
 *       responses:
 *         '200': { description: 'PaymentAccountView atualizada' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'payment_account_already_active ou payment_account_invalid_transition' }
 *     delete:
 *       summary: Soft-delete a payment-provider account
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'Apagada (deletedAt preenchido)' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/payment-accounts/{id}/credential:
 *     put:
 *       summary: Set the provider credential (write-only, encrypted at rest) and activate the account
 *       description: >-
 *         AES-256-GCM com AAD = id da conta; chave-mestra no env (PAYMENT_CREDENTIAL_KEYS).
 *         Sem a chave, 503 payment_credential_key_missing e nada é gravado.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SetPaymentCredentialInput' }
 *       responses:
 *         '200': { description: 'PaymentAccountView (ACTIVE) - sem a credencial' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'payment_account_already_active' }
 *         '503': { description: 'payment_credential_key_missing' }
 *   /api/payment-accounts/{id}/release-report/unblock:
 *     post:
 *       summary: Unblock the daily release-report job for this account (review of PR 615, A2)
 *       description: >-
 *         O job mpReleaseReportFetch para na conta quando o arquivo do Mercado Pago sobrepõe extrato já importado
 *         (releaseReportBlockedReason na view + audit payment_account.release_report_blocked). Depois de resolver a
 *         sobreposição (ex.: excluir o extrato manual), o operador destrava aqui; o próximo ciclo baixa a faixa de novo.
 *         Conta não bloqueada ⇒ 200 sem efeito.
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
 *               additionalProperties: false
 *               required: [unitId]
 *               properties:
 *                 unitId: { type: string }
 *       responses:
 *         '200': { description: 'PaymentAccountView com releaseReportBlockedReason null' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
