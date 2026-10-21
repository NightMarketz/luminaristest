/**
 * OpenAPI de /api/accounting/ibs-cbs-assessments (IBS-CBS-2027 PR-2, BRIEF item 13).
 * Um arquivo por feature (dono, 2026-10-16); o gerador e o docs.ts leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/ibs-cbs-assessments/preview:
 *     post:
 *       summary: Preview the monthly IBS or CBS assessment of the regular regime (IBS-CBS-2027 PR-2, items 6-11)
 *       description: >-
 *         Soma o IBS ou a CBS declarado nas NFS-e/NF-e autorizadas do mês (LC 214 art. 60 § 1º - nunca alíquota x
 *         base) e não persiste. Créditos ficam para o PR-3 (saldo = débitos). A memória avisa documento sem o
 *         tributo, venda liquidada sem documento, conferência pulada (sem base gravada ou alíquota não publicada).
 *         400 para SIMPLES/MEI (art. 41 § 1º), ano < 2027 (F-IBS-7 b), perfil do ano ausente e outra unidade da PJ
 *         com movimento no mês.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/IbsCbsAssessmentPreviewInput' }
 *       responses:
 *         '200': { description: 'IbsCbsPreviewView (débitos, créditos, saldo, memória, expectedSupersedesId, avisos)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/ibs-cbs-assessments:
 *     get:
 *       summary: List the IBS/CBS assessments of the company in a year (IBS-CBS-2027 PR-2, item 13)
 *       description: >-
 *         Lista da PJ inteira (CONFIRMED e SUPERSEDED); unitId só resolve escopo/policy. Ano < 2027 ⇒ 400.
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
 *     post:
 *       summary: Confirm the monthly IBS or CBS assessment (IBS-CBS-2027 PR-2, items 9 and 12)
 *       description: >-
 *         409: IBS_CBS_ASSESSMENT_CAS, _ORDER ou _STALE
 *         Recalcula e grava numa tx com os gates - CAS do expectedSupersedesId (409), mês novo atrás de um posterior
 *         confirmado (409) - e, ao substituir, derruba os meses posteriores do mesmo tributo (reconfirmar). Depois do
 *         commit, a reclassificação receita -> IBS/CBS a recolher (F-IBS-8 c) é best-effort (provisaoPendente).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/IbsCbsAssessmentConfirmInput' }
 *       responses:
 *         '201': { description: 'IbsCbsConfirmView (apuracao, reconfirmar)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { description: 'IBS_CBS_ASSESSMENT_CAS, _ORDER ou _STALE' }
 *
 *   /api/accounting/ibs-cbs-assessments/{id}/provisao:
 *     post:
 *       summary: Reconcile the revenue-to-liability reclassification of an IBS/CBS assessment (IBS-CBS-2027 PR-2, item 12)
 *       description: >-
 *         Idempotente: completa o que faltar (estorno da substituída, lançamento, vínculo) sem refazer nada. Período
 *         fechado ou conta a recolher não configurada ⇒ 400.
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
 *         '200': { description: 'IbsCbsAssessmentView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 */
export {};
