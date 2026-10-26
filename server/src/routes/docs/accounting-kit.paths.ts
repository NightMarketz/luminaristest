/**
 * OpenAPI de /api/accounting-kit.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting-kit:
 *     get:
 *       summary: The unit's installed sector kit — version, latest version, last upgrade run, open pendings, changelog (BE-INCR-KIT-SETOR PR-4)
 *       description: >-
 *         Item 38. data = null quando a unidade não tem kit. changelog = as entradas novas de cada versão depois da
 *         instalada. A atualização em si não tem rota: roda pelo upgradeSectorKitsCli no passo de migração do deploy
 *         (dry-run gravado, depois apply do mesmo deploy). steps = o último passo concluído da instalação (0–7) e os
 *         avisos do referencial (KIT_REFERENTIAL_SKIPPED_NO_REGIME | KIT_REFERENTIAL_SKIPPED_NO_CATALOG) — EMENDA-2 da LAC-B.
 *       tags: [AccountingKit]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: '{ kitKey, kitVersion, latestVersion, status, lastRun: { id, mode, status, fromVersion, toVersion, deployId, startedAt, finishedAt, counts: { additive, forward, conflicts } } | null, openPendingCount, changelog: [{ kitVersion, entries }], steps: { lastCompletedStep, warnings } } | null' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting-kit/pending:
 *     get:
 *       summary: List the kit upgrade pendings (level c — conflicts the upgrade did not apply)
 *       tags: [AccountingKit]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [OPEN, ACCEPTED, REJECTED] } }
 *       responses:
 *         '200': { description: 'KitUpgradePendingView[] — { id, kitKey, toVersion, runId, itemKey, reason (override | account_deleted_by_user | account_changed_in_use | field_set_by_user | referential_year_frozen | referential_mapped_differently), kitValue, tenantValue, status, decidedById, decidedAt, motivo, createdAt }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting-kit/pending/{id}/accept:
 *     post:
 *       summary: Accept a kit upgrade pending — applies the kit's value for that item
 *       description: >-
 *         Por motivo: override ⇒ remove o ajuste e recompila (Draft ⇒ 422 e nada muda); account_deleted_by_user ⇒
 *         restaura a conta e recompila (Draft ⇒ 422 KIT_PENDING_COMPILE_DRAFT e a conta volta a ser apagada);
 *         account_changed_in_use ⇒ renomeia (a natureza nunca muda com partida); field_set_by_user ⇒ grava o valor do
 *         kit por cima (regra do contador ativo vale); referential_mapped_differently ⇒ troca o mapeamento;
 *         referential_year_frozen ⇒ 422 KIT_PENDING_FROZEN_YEAR (só dá para recusar).
 *       tags: [AccountingKit]
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
 *               required: [unitId, motivo]
 *               properties:
 *                 unitId: { type: string }
 *                 motivo: { type: string, minLength: 10, maxLength: 500 }
 *       responses:
 *         '200': { description: 'KitUpgradePendingView (status ACCEPTED)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { description: 'KIT_PENDING_NOT_FOUND' }
 *         '409': { description: 'KIT_PENDING_NOT_OPEN — já decidida' }
 *         '422': { description: 'KIT_PENDING_FROZEN_YEAR | KIT_PENDING_COMPILE_DRAFT | ROLE_OVERRIDE_COMPILE_DRAFT' }
 *
 *   /api/accounting-kit/pending/{id}/reject:
 *     post:
 *       summary: Reject a kit upgrade pending — keeps the tenant's value; it does not come back for the same kit version
 *       tags: [AccountingKit]
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
 *               required: [unitId, motivo]
 *               properties:
 *                 unitId: { type: string }
 *                 motivo: { type: string, minLength: 10, maxLength: 500 }
 *       responses:
 *         '200': { description: 'KitUpgradePendingView (status REJECTED)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { description: 'KIT_PENDING_NOT_FOUND' }
 *         '409': { description: 'KIT_PENDING_NOT_OPEN — já decidida' }
 *
 *   /api/accounting-kit/role-overrides:
 *     get:
 *       summary: List the unit's live role→account adjustments over the installed sector kit (BE-INCR-KIT-SETOR PR-3)
 *       tags: [AccountingKit]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'RoleAccountOverrideView[] — { id, role, accountId, accountCode, kitAccountCode (código do kit instalado para o papel, ou null), motivo, setById, createdAt, updatedAt }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting-kit/role-overrides/{role}:
 *     put:
 *       summary: Set the account for a binding role of the installed kit and recompile the binding
 *       description: >-
 *         O papel é o do binding do kit, com sub-chave quando houver (caixa-por-metodo:Pix — codifique na URL). Gate
 *         in-tx: kit INSTALLED (senão 422 KIT_NOT_INSTALLED), papel usado pelo kit (senão 422 ROLE_NOT_IN_KIT), conta
 *         viva do escopo (422 ACCOUNT_NOT_FOUND), folha (422 ACCOUNT_NOT_LEAF) e natureza aceita pelo papel (422
 *         ROLE_ACCOUNT_NATURE_MISMATCH, a mesma tabela do validador do binding). Grava o ajuste e recompila o binding
 *         do kit com os ajustes vivos (nova bindingVersion Active). Compile reprovado ⇒ o ajuste é desfeito e
 *         auditado, e a resposta é 422 ROLE_OVERRIDE_COMPILE_DRAFT com { binding: { status: 'Draft', bindingVersion },
 *         blocking, missingEventKeys }.
 *       tags: [AccountingKit]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: role, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [unitId, accountId, motivo]
 *               properties:
 *                 unitId: { type: string }
 *                 accountId: { type: string }
 *                 motivo: { type: string, minLength: 10, maxLength: 500 }
 *       responses:
 *         '200': { description: "{ override: RoleAccountOverrideView, binding: { status: 'Active', bindingVersion } }" }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '422': { description: 'KIT_NOT_INSTALLED | ROLE_NOT_IN_KIT | ACCOUNT_NOT_FOUND | ACCOUNT_NOT_LEAF | ROLE_ACCOUNT_NATURE_MISMATCH | ROLE_OVERRIDE_COMPILE_DRAFT' }
 *     delete:
 *       summary: Remove the role adjustment and recompile the binding back to the kit's account code
 *       tags: [AccountingKit]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: role, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: "{ binding: { status: 'Active', bindingVersion } }" }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { description: 'ROLE_OVERRIDE_NOT_FOUND — o papel não tem ajuste vivo' }
 *         '422': { description: 'KIT_NOT_INSTALLED | ROLE_NOT_IN_KIT | ROLE_OVERRIDE_COMPILE_DRAFT' }
 */
/**
 * @openapi
 * paths:
 *   /api/accounting-kit/trace:
 *     get:
 *       summary: Trace event → accounting fact → journal entry (KIT-SETOR PR-6, item 50)
 *       description: >-
 *         Só leitura. eventKey = sourceType do lançamento; archetypeKey e bindingVersion vêm do binding gravado no
 *         lançamento (null em lançamento manual, de subrazão ou anterior ao PR-6).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: sourceType, required: true, schema: { type: string } }
 *         - { in: query, name: sourceId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'KitTraceView ({ eventKey, archetypeKey|null, bindingVersion|null, journalEntryId })' }
 *         '400': { description: 'query inválida' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { description: 'nenhum lançamento para o evento nesta unidade' }
 */
export {};
