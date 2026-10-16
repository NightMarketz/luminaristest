/**
 * OpenAPI de /api/accounting/policy-versions.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/policy-versions:
 *     post:
 *       summary: O dono propõe mudança de parâmetro governado (BE-INCR-ACCOUNTING-POLICY-VERSION, F-POL-3 a)
 *       description: >-
 *         Com contador responsável ACTIVE, FiscalProfile e AccountingScopeSettings só mudam por proposta aprovada
 *         (F-POL-2 b). O payload é o corpo do PUT do alvo sem unitId (FISCAL_PROFILE = substituição completa;
 *         SCOPE_SETTINGS = patch). Uma PROPOSED anterior do mesmo alvo vira SUPERSEDED (F-POL-6 a).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ProposePolicyVersionInput' }
 *       responses:
 *         '201': { description: 'PolicyVersionView (status PROPOSED)' }
 *         '400': { description: 'DTO inválido ou conta referenciada inválida no escopo' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '409': { description: 'POLICY_NO_ACCOUNTANT (sem contador ativo — use o PUT)' }
 *     get:
 *       summary: Histórico de versões de política do escopo, mais nova primeiro (dono ou contador ativo do par)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: target, required: false, schema: { type: string, enum: [FISCAL_PROFILE, SCOPE_SETTINGS] } }
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [PROPOSED, APPLIED, REJECTED, SUPERSEDED] } }
 *         - { in: query, name: ownerUserId, required: false, schema: { type: string }, description: 'Dono do escopo (contador)' }
 *       responses:
 *         '200': { description: 'PolicyVersionView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { description: 'ForbiddenError ou ACCOUNTANT_NOT_ASSIGNED' }
 *
 *   /api/accounting/policy-versions/{id}:
 *     get:
 *       summary: Detalhe da versão com o estado atual do alvo e o rótulo das contas referenciadas
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: ownerUserId, required: false, schema: { type: string } }
 *       responses:
 *         '200': { description: 'PolicyVersionDetailView (payload, current, accountLabels)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { description: 'ForbiddenError ou ACCOUNTANT_NOT_ASSIGNED' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/policy-versions/{id}/approve:
 *     post:
 *       summary: O contador ativo aprova e aplica a proposta, na mesma transação (F-GOV-7 a+ — decide, não propõe)
 *       description: >-
 *         PROPOSED → APPLIED + aplicação no alvo. Se a aplicação falhar (conta apagada, regime da empresa mudado),
 *         nada muda e a proposta segue PROPOSED.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApprovePolicyVersionInput' }
 *       responses:
 *         '200': { description: 'PolicyVersionView (status APPLIED, appliedSnapshot)' }
 *         '400': { description: 'DTO inválido ou payload não aplicável agora' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { description: 'ACCOUNTANT_REQUIRED ou ACCOUNTANT_NOT_ASSIGNED' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'POLICY_VERSION_STATUS_CHANGED (já decidida ou substituída)' }
 *
 *   /api/accounting/policy-versions/{id}/reject:
 *     post:
 *       summary: O contador ativo rejeita a proposta, com motivo
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RejectPolicyVersionInput' }
 *       responses:
 *         '200': { description: 'PolicyVersionView (status REJECTED)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { description: 'ACCOUNTANT_REQUIRED ou ACCOUNTANT_NOT_ASSIGNED' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'POLICY_VERSION_STATUS_CHANGED' }
 */
export {};
