/**
 * OpenAPI de /api/accounting/delivery.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/delivery/build:
 *     post:
 *       summary: Preflight do pacote ECD/ECF - valida os jobs e o fechamento do ano, sem persistir
 *       description: >-
 *         Resolve os dois jobs no escopo (ECD e ECF, EXPORTED, com sha256 gravado), exige os DOZE
 *         meses do ano-calendário em HARD_CLOSED (F-CD7-a) e devolve o manifesto sem destinatário.
 *         Não persiste, não audita e NÃO ENVIA - sob F-CD1-a o servidor não tem canal nem credencial.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/BuildDeliveryPackageInput' }
 *       responses:
 *         '200': { description: 'manifesto com scope, year, files (kind, jobId, sha256) e generatedAt' }
 *         '400': { description: 'DTO inválido, job que não é ECD/ECF, job sem sha256 ou ano não fechado' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/delivery/confirm:
 *     post:
 *       summary: Registra a entrega do pacote ao contador (confirmação explícita do operador)
 *       description: >-
 *         Re-checa o gate dos 12 meses DENTRO da transação e grava o log com status SENT. SENT
 *         significa que o operador confirmou que despachou o pacote, nunca que o servidor confirmou
 *         entrega. Idempotente pela tripla ecdJobId + ecfJobId + contactId.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ConfirmDeliveryInput' }
 *       responses:
 *         '201': { description: 'deliveryId, status, statusMeaning, contact (name, crcNumber, crcUf) e manifest' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *         '429': { description: 'Rate limit por escopo (ator + unidade) excedido - DELIVERY_CONFIRM_RATE_LIMIT por 15 min, padrao 60' }
 *
 *   /api/accounting/delivery:
 *     get:
 *       summary: Delivery history of the scope (paginated, newest first, each with its items)
 *       description: >-
 *         FE-INCR-DELIVERY PR-D1 (F-FE-DL-4 - a). Lists the AccountingDeliveryLog rows of the scope, each with its
 *         items (core ECD/ECF + extras, ordered by position). year filters by the package periodStart. Same read
 *         policy as GET /delivery/{id} (canReadAccountingContact).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [QUEUED, SENT, FAILED] } }
 *         - { in: query, name: year, required: false, schema: { type: integer } }
 *         - { in: query, name: page, required: false, schema: { type: integer, minimum: 1, default: 1 } }
 *         - { in: query, name: limit, required: false, schema: { type: integer, minimum: 1, maximum: 100, default: 20 } }
 *       responses:
 *         '200': { description: '{ items: [AccountingDeliveryLog & { items: [{ id, jobId, kind, sha256, position }] }], total, page, limit }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/delivery/profile:
 *     get:
 *       summary: Le o perfil de pacote sugerido de um contato (C6b PR-3, F-C6b-2 a)
 *       description: >-
 *         404: Contato nao encontrado ou arquivado (cross-tenant tambem cai aqui)
 *         kinds que a UI pre-marca no build - SUGESTAO, nao gate. null (nunca salvo) devolve
 *         kinds vazio, nunca 404. Segmento estatico registrado ANTES de /delivery/{id}.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: contactId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: '{ kinds: ExportKind[] }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     put:
 *       summary: Grava o perfil de pacote sugerido de um contato (C6b PR-3, F-C6b-2 a)
 *       description: >-
 *         404: Contato nao encontrado ou arquivado
 *         Perfil e sugestao, nunca gate - o corpo do build/confirm pode divergir do perfil salvo e
 *         passa normalmente. Quem valida extraJobIds e sempre resolveExtras do build/confirm.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: contactId, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PackageProfileInput' }
 *       responses:
 *         '200': { description: '{ kinds: ExportKind[] } gravado' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/delivery/{id}/retry:
 *     post:
 *       summary: Reprocessa uma entrega FAILED (FAILED para QUEUED na linha existente)
 *       description: >-
 *         Só transiciona FAILED para QUEUED, incrementando attemptCount. Reenvio de uma entrega já
 *         SENT NÃO é coberto por este comando (400) - é frente adjacente, não decisão implícita.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RetryDeliveryInput' }
 *       responses:
 *         '200': { description: 'AccountingDeliveryLog em QUEUED' }
 *         '400': { description: 'DTO inválido, deliveryId divergente do id da rota, ou status diferente de FAILED' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/delivery/{id}:
 *     get:
 *       summary: Le o log de uma entrega (escopado; cross-tenant devolve 404)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'AccountingDeliveryLog' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 */
export {};
