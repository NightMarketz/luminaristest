/**
 * OpenAPI de /api/accounting/tax-assessments.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/tax-assessments/preview:
 *     post:
 *       summary: Preview the quarterly IRPJ/CSLL assessment (BE-INCR-TAX-ASSESSMENT Fase A PR-2, X7 item 13)
 *       description: >-
 *         Calcula IRPJ e CSLL juntos (Presumido ou Real trimestral; X7 Fase B: Real anual - estimativa por receita
 *         bruta ou balancete de suspensão/redução em A01..A12, conforme modoMensal, e ajuste anual em A00) e não
 *         persiste. 400 para SIMPLES/MEI (DAS), período fora da forma do perfil do ano (T0x só TRIMESTRAL, A0x só
 *         ANUAL), perfil do ano ausente e outra unidade da PJ com movimento na janela lida. O balancete avisa (não
 *         recusa) os meses anteriores ainda abertos.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TaxAssessmentPreviewInput' }
 *       responses:
 *         '200': { description: 'TaxAssessmentPreviewView (irpj, csll, provisaoContasConfiguradas, avisos)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting/tax-assessments:
 *     get:
 *       summary: List the IRPJ/CSLL (and PIS/Cofins, X8 PR-2) assessments of the company in a year (X7 item 17)
 *       description: >-
 *         Lista da PJ inteira; unitId só resolve escopo/policy. Cada linha traz a memória e provisaoPendente.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: anoCalendario, required: true, schema: { type: integer } }
 *         - { in: query, name: periodo, required: false, schema: { type: string, enum: [T01, T02, T03, T04, A00, A01, A02, A03, A04, A05, A06, A07, A08, A09, A10, A11, A12, M01, M02, M03, M04, M05, M06, M07, M08, M09, M10, M11, M12] }, description: "M01..M12 = PIS/Cofins mensal (X8 PR-2)" }
 *         - { in: query, name: tributo, required: false, schema: { type: string, enum: [IRPJ, CSLL, PIS, COFINS] } }
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [CONFIRMED, SUPERSEDED] } }
 *       responses:
 *         '200': { description: 'TaxAssessmentView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *     post:
 *       summary: Confirm the quarterly IRPJ/CSLL assessment (commit 1, X7 item 14)
 *       description: >-
 *         Recalcula e grava as 2 linhas (IRPJ, CSLL) numa tx com os gates - CAS do a pagar (409), um só CONFIRMED
 *         por período (409; substituir = supersedesIds), ordem dos trimestres (409), regime igual (409) - e trava
 *         a forma de apuração do ano. Substituir um trimestre marca SUPERSEDED os posteriores (reconfirmar).
 *         X7 Fase B: nos meses A0m a ordem é mensal e a cascata derruba os meses seguintes e o A00; o balancete
 *         exige os meses anteriores em atividade fechados (400). Depois do commit, a provisão no razão é best-effort
 *         (pendente fica visível em provisaoPendente).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TaxAssessmentConfirmInput' }
 *       responses:
 *         '201': { description: 'TaxAssessmentConfirmView (irpj, csll, reconfirmar)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '409': { description: 'TAX_ASSESSMENT_CAS, _ALREADY_CONFIRMED, _SUPERSEDES, _ORDER, _REGIME ou _STALE' }
 *
 *   /api/accounting/tax-assessments/periodos:
 *     get:
 *       summary: Expected periods of the year by tax family - X7 IRPJ/CSLL, X8 PIS/Cofins, Simples (TAX-ASSESSMENT-PERIODOS)
 *       description: >-
 *         Leitura pura. Para cada familia diz se e apuravel (motivo PERFIL_AUSENTE, REGIME_DAS, REGIME_NAO_SIMPLES ou
 *         REGIME_SEM_APURACAO quando nao), a forma (X7) ou a modalidade (X8) e os periodos esperados - T01..T04 ou
 *         A01..A12 + A00, M01..M12, competencias YYYY-MM - com o estado por tributo (SEM_APURACAO, CONFIRMED com id e
 *         aPagarCents, SO_SUPERSEDED, FORA_DA_ATIVIDADE, REVOGADO). Nenhuma regra nova - as mesmas funcoes da previa.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: anoCalendario, required: true, schema: { type: integer, minimum: 2000, maximum: 2100 } }
 *       responses:
 *         '200': { description: 'TaxAssessmentPeriodosView (anoCalendario, regime, familias)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting/tax-assessments/pis-cofins/preview:
 *     post:
 *       summary: Preview the monthly PIS/Cofins assessment (BE-INCR-PIS-COFINS PR-2, X8 item 13)
 *       description: >-
 *         Calcula PIS e Cofins do mês juntos e não persiste - Presumido cumulativo (0,65%/3%), Real não cumulativo
 *         (1,65%/7,6%) com o crédito das NF-e do mês, outros créditos do art. 3º, saldo credor do mês anterior e
 *         retenções. 400 para SIMPLES/MEI (DAS), 2027+ (revogados), perfil do ano ausente, regime de caixa,
 *         pisCofinsRegime da unidade divergente do regime da empresa, outra unidade da PJ com movimento no mês,
 *         ajustes acima da receita da atividade. 409 quando o mês anterior do mesmo ano não está confirmado.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PisCofinsPreviewInput' }
 *       responses:
 *         '200': { description: 'PisCofinsPreviewView (pis, cofins, provisaoContasConfiguradas, avisos)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '409': { description: 'TAX_ASSESSMENT_ORDER' }
 *
 *   /api/accounting/tax-assessments/pis-cofins:
 *     post:
 *       summary: Confirm the monthly PIS/Cofins assessment (commit 1, X8 item 14)
 *       description: >-
 *         Recalcula e grava as 2 linhas (PIS, COFINS) numa tx com os gates - CAS do a pagar (409), um só CONFIRMED
 *         por (PJ, ano, tributo, mês) (409; substituir = supersedesIds), ordem sequencial dos meses (409). Substituir
 *         derruba os meses posteriores confirmados e os devolve em reconfirmar (BE-INCR-LEGAL-PARAMS PR-4); confirmar
 *         um mês novo por trás de um posterior confirmado segue 409. Sem provisão no razão neste
 *         PR (provisaoPendente = true; a provisão é o PR-3 do X8). Leitura pelos GET de /tax-assessments.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PisCofinsConfirmInput' }
 *       responses:
 *         '201': { description: 'PisCofinsConfirmView (pis, cofins)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '409': { description: 'TAX_ASSESSMENT_CAS, _ALREADY_CONFIRMED, _SUPERSEDES, _ORDER ou _STALE' }
 *
 *   /api/accounting/tax-assessments/{id}/provisao:
 *     post:
 *       summary: Reconcile the ledger provision of an IRPJ/CSLL or PIS/COFINS assessment (X7 Fase A item 16; X8 item 18)
 *       description: >-
 *         Completes whatever the confirmation left pending: reverses the live provision of the superseded
 *         assessments, posts the provision (debit expense / credit tax payable, amount = devidoCents, last day of the
 *         quarter, idempotent by source) and links provisaoEntryId. X7 Fase B: month A0m posts devido + diferença
 *         postergada on the last day of the month; A00 posts only the difference to what the months provisioned, on
 *         31/12 - negative = debit the negative balance to offset (Asset) / credit expense; zero posts nothing. Nothing already done is redone, so calling it again
 *         changes nothing. On a SUPERSEDED assessment it only reverses its own live provision. X8 PR-3: PIS/COFINS
 *         (M01..M12) posts debit expense / credit tax payable = gross debit on the last day of the month and, in the
 *         non-cumulative regime, debit tax payable / credit PIS/COFINS recoverable = the NF-e credit used in the month.
 *         400 when the provision
 *         accounts are not configured on the unit fiscal profile or the period is closed.
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
 *       responses:
 *         '200': { description: 'TaxAssessmentView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/tax-assessments/{id}:
 *     get:
 *       summary: Read one IRPJ/CSLL assessment with its calculation memory (X7 item 17)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'TaxAssessmentView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
