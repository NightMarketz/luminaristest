/**
 * OpenAPI de /api/accounting/ibs-cbs-assessments (IBS-CBS-2027 PR-2, BRIEF item 13).
 * Um arquivo por feature (dono, 2026-10-16); o gerador lê a pasta src/routes inteira.
 * @openapi
 * paths:
 *   /api/accounting/ibs-cbs-assessments/preview:
 *     post:
 *       summary: Preview the monthly IBS or CBS assessment (IBS-CBS-2027 PR-2, items 6-11)
 *       description: >-
 *         Débito = IBS/CBS destacado nos documentos autorizados do mês (dia escrito; LC 214 art. 60 § 1º). A conferência
 *         pela tabela só gera aviso. Créditos = 0 até o PR-3. Não persiste. 400 nomeado para SIMPLES/MEI e anoCalendario
 *         anterior a 2027 (F-IBS-7 b).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [unitId, anoCalendario, mes, tributo]
 *               properties:
 *                 unitId: { type: string }
 *                 anoCalendario: { type: integer, minimum: 2027 }
 *                 mes: { type: integer, minimum: 1, maximum: 12 }
 *                 tributo: { type: string, enum: [IBS, CBS] }
 *       responses:
 *         '200': { description: 'IbsCbsPreviewView (debitosCents, creditosCents, saldoCents, documentosSemGrupo, memoria)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/ibs-cbs-assessments:
 *     post:
 *       summary: Confirm the monthly IBS or CBS assessment (IBS-CBS-2027 PR-2, item 9)
 *       description: >-
 *         Grava a linha CONFIRMED. expectedSupersedesId = id CONFIRMED vivo do mês (null na 1ª); divergente ⇒ 409.
 *         Substituir o mês derruba os meses posteriores do tributo (reconfirmar). A provisão (item 12) ainda não é
 *         lançada: provisaoEntryId fica null e a memória traz PROVISAO_PENDENTE_ITEM_12.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [unitId, anoCalendario, mes, tributo, expectedSupersedesId]
 *               properties:
 *                 unitId: { type: string }
 *                 anoCalendario: { type: integer, minimum: 2027 }
 *                 mes: { type: integer, minimum: 1, maximum: 12 }
 *                 tributo: { type: string, enum: [IBS, CBS] }
 *                 expectedSupersedesId: { type: string, nullable: true }
 *       responses:
 *         '201': { description: 'IbsCbsConfirmView (assessment, reconfirmar)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { description: 'CAS de expectedSupersedesId, ordem ou perfil alterado durante a confirmação' }
 *     get:
 *       summary: List the IBS/CBS assessments of the company in a year (IBS-CBS-2027 PR-2, item 13)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: anoCalendario, required: true, schema: { type: integer, minimum: 2027 } }
 *       responses:
 *         '200': { description: 'IbsCbsAssessmentView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 */
export {};
