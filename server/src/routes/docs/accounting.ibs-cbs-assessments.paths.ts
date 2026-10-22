/**
 * OpenAPI de /api/accounting/ibs-cbs-assessments (IBS-CBS-2027 PR-2, BRIEF item 13) e da apropriação do crédito de IBS/CBS
 * de uma nota (PR-3, item 16 — rota ratificada no F-IBS-12 a).
 * Um arquivo por feature (dono, 2026-10-16); o gerador lê a pasta src/routes inteira.
 * @openapi
 * paths:
 *   /api/accounting/ibs-cbs-assessments/preview:
 *     post:
 *       summary: Preview the monthly IBS or CBS assessment (IBS-CBS-2027 PR-2, items 6-11)
 *       description: >-
 *         Débito = IBS/CBS destacado nos documentos autorizados do mês (dia escrito; LC 214 art. 60 § 1º). A conferência
 *         pela tabela só gera aviso. PR-3: créditos = Σ créditos APROPRIADO no mês (art. 47; PENDENTE só na memória);
 *         a antecipação do pacote pago no mês soma ao débito (art. 10 § 4º). Não persiste. 400 nomeado para SIMPLES/MEI,
 *         anoCalendario anterior a 2027 (F-IBS-7 b) e pacote no mês sem alíquota publicada (IBS_CBS_ANTECIPACAO_SEM_ALIQUOTA).
 *         CBS sem linha publicada e com taxa PROVISÓRIA (tabela IBS_CBS_PROVISORIA, dono 22/10): 200 com status
 *         CALCULATED_PROVISIONAL e warnings [CBS_RATE_PENDING_SENATE_RES] — só na prévia; a confirmação segue 400.
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
 *         '200': { description: 'IbsCbsPreviewView (status CALCULATED|CALCULATED_PROVISIONAL, warnings, debitosCents, creditosCents, saldoCents, documentosSemGrupo, memoria)' }
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
 *
 *   /api/accounting/ibs-cbs-assessments/{id}/provisao:
 *     post:
 *       summary: Reconcile the revenue → IBS/CBS payable reclassification of an assessment (IBS-CBS-2027 PR-2, item 12)
 *       description: >-
 *         Completa o que faltar (estorno da substituída, lançamento D receita / C a recolher no último dia do mês, vínculo
 *         provisaoEntryId). Idempotente. 400 se a conta de IBS/CBS a recolher não estiver no perfil fiscal ou o período
 *         estiver fechado.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'IbsCbsAssessmentView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/payables/{id}/ibs-cbs-credits/apropriar:
 *     post:
 *       summary: Appropriate the IBS or CBS credit of a purchase note (IBS-CBS-2027 PR-3, item 16)
 *       description: >-
 *         PENDENTE → APROPRIADO do crédito de IBS/CBS da nota (LC 214 art. 47; F-IBS-4 a), com o comprovante da extinção
 *         (SourceDocument do escopo) obrigatório. CAS: a linha tem de estar em expectedStatus (PENDENTE) — senão 409
 *         IBS_CBS_CREDITO_CAS. Sem lançamento: o crédito está em IBS/CBS a recuperar desde a entrada; a apuração do mês
 *         de apropriadoEm o soma e o compensa. payableId no corpo é opcional e, quando vem, tem de ser o id da rota.
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
 *               required: [unitId, tributo, sourceDocumentId, expectedStatus]
 *               properties:
 *                 unitId: { type: string }
 *                 payableId: { type: string }
 *                 tributo: { type: string, enum: [IBS, CBS] }
 *                 sourceDocumentId: { type: string }
 *                 expectedStatus: { type: string, enum: [PENDENTE] }
 *       responses:
 *         '200': { description: 'linha de crédito (tributo, amountCents, status APROPRIADO, sourceDocumentId, apropriadoEm)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { description: 'IBS_CBS_CREDITO_CAS — o crédito não está mais PENDENTE' }
 */
export {};
