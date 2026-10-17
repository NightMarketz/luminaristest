/**
 * OpenAPI de /api/accounting/accountant-assignments.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/accountant-assignments:
 *     post:
 *       summary: Convida o contador responsável do escopo (BE-INCR-ACCOUNTANT-GOVERNANCE, F-GOV-8 a)
 *       description: >-
 *         404: Contato não encontrado no escopo · 409: ASSIGNMENT_PENDING_EXISTS
 *         O dono aponta um usuário já cadastrado pelo e-mail e um contato do escopo (fonte do CRC, gravado em
 *         snapshot). Nasce PENDING; só governa depois do aceite do contador.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/InviteAccountantInput' }
 *       responses:
 *         '201': { description: 'AccountantAssignmentView (status PENDING)' }
 *         '400': { description: 'DTO inválido, ACCOUNTANT_USER_NOT_FOUND ou SELF_ASSIGNMENT' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *     get:
 *       summary: Histórico de atribuições do escopo (dono), do mais novo ao mais velho
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'AccountantAssignmentView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/accountant-assignments/mine:
 *     get:
 *       summary: Atribuições PENDING e ACTIVE do contador logado, com o e-mail e o id do dono (ownerUserId, o que vai nos 9 handlers do F-GOV-7)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200': { description: 'MyAccountantAssignmentView[]' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/accounting/accountant-assignments/{id}/accept:
 *     post:
 *       summary: O contador aceita a atribuição (F-GOV-8 a reforçada — declara contrato escrito)
 *       description: >-
 *         PENDING → ACTIVE. Se o escopo já tem contador ACTIVE, ele é encerrado (SUPERSEDED) na mesma transação.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AcceptAccountantAssignmentInput' }
 *       responses:
 *         '200': { description: 'AccountantAssignmentView (status ACTIVE)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Atribuição inexistente ou o ator não é o contador convidado' }
 *         '409': { description: 'ASSIGNMENT_STATUS_CHANGED' }
 *
 *   /api/accounting/accountant-assignments/{id}/end:
 *     post:
 *       summary: Dono ou contador encerra a atribuição, com motivo (F-GOV-10 a)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/EndAccountantAssignmentInput' }
 *       responses:
 *         '200': { description: 'AccountantAssignmentView (status ENDED)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Atribuição inexistente ou o ator não é parte dela' }
 *         '409': { description: 'ASSIGNMENT_STATUS_CHANGED (já encerrada)' }
 */
export {};
