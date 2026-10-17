/**
 * OpenAPI de /api/accounting/reviews.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 *
 * BE-INCR-REVIEW-LAYER (nó C11) — revisão profissional editável. 8 paths / 9 operações.
 *
 * @openapi
 * paths:
 *   /api/accounting/reviews:
 *     post:
 *       summary: Abre a revisao profissional sobre um par (ou um) de jobs SPED EXPORTED
 *       description: >-
 *         409: REVIEW_ALREADY_OPEN
 *         Pelo menos um de ecdJobId/ecfJobId; ambos do escopo, EXPORTED, com periodo gravado e do
 *         mesmo exercicio (year). Uma revisao por par (F-C11-5) - repetir devolve 409 REVIEW_ALREADY_OPEN.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/OpenReviewInput' }
 *       responses:
 *         '201': { description: 'AccountingReview OPEN' }
 *         '400': { description: 'DTO invalido, job que nao e ECD/ECF, job nao EXPORTED ou de outro ano' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *     get:
 *       summary: Lista revisoes do escopo (filtros year, status)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: year, required: false, schema: { type: integer } }
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [OPEN, SIGNED_OFF, REJECTED] } }
 *         - { in: query, name: ownerUserId, required: false, schema: { type: string }, description: "GOV-CONTADOR: dono que o contador responsavel atende; ausente = escopo do proprio usuario; sem atribuicao ACTIVE do par = 403 ACCOUNTANT_NOT_ASSIGNED" }
 *       responses:
 *         '200': { description: 'AccountingReview[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/reviews/{id}:
 *     get:
 *       summary: Le a revisao com os achados e, por achado resolvido, a trilha de auditoria do alvo apontado
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: ownerUserId, required: false, schema: { type: string }, description: "GOV-CONTADOR: dono que o contador responsavel atende; ausente = escopo do proprio usuario; sem atribuicao ACTIVE do par = 403 ACCOUNTANT_NOT_ASSIGNED" }
 *       responses:
 *         '200': { description: 'review + findings[{ finding, targetAuditEvents }]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/reviews/{id}/findings:
 *     post:
 *       summary: Registra um achado (BLOCKER | NOTE) em revisao OPEN
 *       description: "409: REVIEW_NOT_OPEN"
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AddFindingInput' }
 *       responses:
 *         '201': { description: 'AccountingReviewFinding' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/reviews/{id}/findings/{findingId}/resolve:
 *     post:
 *       summary: Resolve o achado por DATA_EDIT (ponteiro para o dado editado no servico dono) ou NO_ACTION (nota obrigatoria)
 *       description: "409: REVIEW_NOT_OPEN | FINDING_ALREADY_RESOLVED"
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: path, name: findingId, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ResolveFindingInput' }
 *       responses:
 *         '200': { description: 'AccountingReviewFinding resolvido' }
 *         '400': { description: 'DTO invalido ou alvo inexistente no escopo' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/reviews/{id}/findings/{findingId}/adjustment:
 *     post:
 *       summary: Lancamento de acerto extemporaneo via PostingService (idempotente por findingId)
 *       description: >-
 *         409: REVIEW_NOT_OPEN | FINDING_ALREADY_RESOLVED
 *         postingDate em periodo OPEN (F-C11-4 a). sourceType=review_adjustment, sourceId=findingId -
 *         a segunda chamada devolve o MESMO entryId. reverseOriginal so com register=I200 (locator=entryId).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: path, name: findingId, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AdjustmentEntryInput' }
 *       responses:
 *         '201': { description: 'finding + entryId' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *         '422': { description: 'ACCOUNTING_PERIOD_NOT_OPEN' }
 *
 *   /api/accounting/reviews/{id}/jobs:
 *     patch:
 *       summary: Troca o par de jobs pelo regerado (o par antigo fica no evento review.jobs_replaced)
 *       description: "409: REVIEW_NOT_OPEN | REVIEW_ALREADY_OPEN"
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ReplaceReviewJobsInput' }
 *       responses:
 *         '200': { description: 'AccountingReview com o par novo' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/reviews/{id}/sign-off:
 *     post:
 *       summary: Sign-off do profissional (nome + CRC na mascara CFC + declaracao)
 *       description: >-
 *         409: REVIEW_NOT_OPEN | REVIEW_STALE
 *         409 REVIEW_STALE se houver BLOCKER sem resolucao ou achado resolvido depois da geracao dos
 *         jobs - regere e troque o par antes. A entrega ao contador (delivery) exige SIGNED_OFF.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SignOffReviewInput' }
 *       responses:
 *         '200': { description: 'AccountingReview SIGNED_OFF' }
 *         '400': { description: 'DTO invalido ou CRC fora da mascara' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/reviews/{id}/reject:
 *     post:
 *       summary: Rejeita a revisao - o pacote nao deve ser entregue (delivery devolve REVIEW_REJECTED)
 *       description: "409: REVIEW_NOT_OPEN"
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RejectReviewInput' }
 *       responses:
 *         '200': { description: 'AccountingReview REJECTED' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 */
export {};
