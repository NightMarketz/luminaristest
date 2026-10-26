/**
 * OpenAPI de /api/nfe.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/nfe/purchase:
 *     post:
 *       summary: Import a purchase NF-e (XML) as one payable plus its stock inbounds
 *       description: 'Multipart upload of an authorized NF-e 4.00 (cStat 100/150, modelo 55). The note is valued by the acquisition cost formula (vProd menos vDesc mais vFrete, vOutro, vIPI and vST; ICMS próprio is NOT deducted) and rateado across the itens with the rounding residue on the last line, so the shares sum EXACTLY to the total. Books ONE payable for the whole note (débito 1.1.6 Estoques, crédito 2.1.2) plus one stock inbound per SKU (two lines resolving to the same product are folded into a single inbound carrying the summed quantity and cost, so the subledger receives the whole note) — every cent through createPayable, never a direct posting. The 44-digit chave de acesso is the business key, so a re-import of the same note is rejected instead of minting a second liability. Every item needs an operator-confirmed cProd to productRef mapping; an unmapped item rejects the whole import.'
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               required: [unitId, itemMappings, file]
 *               properties:
 *                 unitId:         { type: string }
 *                 counterpartyId: { type: string, description: 'optional id of the operator-confirmed SUPPLIER counterparty for the emitente (never auto-created)' }
 *                 dueDate:        { type: string, format: date, description: 'YYYY-MM-DD; absent means the NF-e issue date' }
 *                 itemMappings:   { type: string, description: 'JSON array of { cProd, productRef } confirmed by the operator, sent as a string because multipart fields are flat' }
 *                 file:           { type: string, format: binary, description: 'the NF-e XML' }
 *       responses:
 *         '201': { description: 'object with payable (the note liability) and ignoredItems (lines with indTot 0, which do not compose the note total and are neither costed nor received)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/nfe/preview:
 *     post:
 *       summary: Dry-run parse of an NF-e XML (preview before import; nothing is written)
 *       description: 'Multipart upload of an NF-e 4.00 XML. Runs the SAME pure parser the purchase import and the sale reconciliation use, and returns the note summary (chave de acesso, ide, emitente/destinatario, itens with indTot, totais in integer cents, protocolo) plus alreadyImported (a live payable with documentNumber = chave already exists in this unit). Rejects exactly what the import rejects (DTD, modelo != 55, homologacao, cStat outside 100/150, invalid chave). Writes nothing, emits no audit event. BE-INCR-NFE-PREVIEW.'
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               required: [unitId, file]
 *               properties:
 *                 unitId: { type: string }
 *                 file:   { type: string, format: binary, description: 'the NF-e XML' }
 *       responses:
 *         '200':
 *           description: 'the parsed note summary'
 *           content:
 *             application/json:
 *               schema: { $ref: '#/components/schemas/NfePreview' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/nfe/sale:
 *     post:
 *       summary: Cross a sale NF-e with the already-posted sale and attach provenance
 *       description: 'Multipart upload of a sale NF-e plus the EXPLICIT saleId anchor (the XML carries no Luminaris sale id, and matching by value and date would attach the note to the wrong sale). Posts NOTHING — the revenue and CMV were already booked by the salon bridge, so re-posting would duplicate both. Attaches exactly one SourceDocument to the existing entry (the chave de acesso is the human externalRef) and returns a divergence report comparing the NF-e total with the booked total. A note whose sale was never booked is rejected.'
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               required: [unitId, saleId, file]
 *               properties:
 *                 unitId: { type: string }
 *                 saleId: { type: string, description: 'explicit operator anchor — the sale whose entry receives the provenance' }
 *                 file:   { type: string, format: binary, description: 'the NF-e XML' }
 *       responses:
 *         '200': { description: 'reconciliation report (totals, difference, divergences, attached SourceDocument id)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 */
/**
 * @openapi
 * paths:
 *   /api/nfe/dfe/status:
 *     get:
 *       summary: Whether NFS-e/NF-e emission is enabled and by which partner (BE-INCR-DFE, nó X10b)
 *       description: >-
 *         Reads DFE_PARTNER_<KIND>/DFE_PARTNER_ENV_<KIND> with fallback to DFE_PARTNER/DFE_PARTNER_ENV —
 *         enabled=false with a named reason when disabled (ADR §7 item 6: nunca em silêncio). Top-level
 *         fields are the NFS-e selection; `porTipo` has one entry per kind (NFSE, NFE, NFCE — BE-INCR-NFCE item 5).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200': { description: '{ enabled, partner, ambiente, reason?, capabilities?, porTipo: { NFSE, NFE, NFCE } }' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/nfe/dfe/preview:
 *     post:
 *       summary: Dry-run the DPS assembly for a sale without persisting or calling the partner
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, saleId, kind]
 *               properties:
 *                 unitId: { type: string }
 *                 saleId: { type: string }
 *                 kind: { type: string, enum: [NFSE, NFE, NFCE] }
 *       responses:
 *         '200': { description: '{ ok, faltantes, competenciaAlerta, payloads, tieOut }' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/nfe/dfe/documents:
 *     post:
 *       summary: Emit one FiscalDocument per distinct cTribNac of the sale's service lines (F-DFE-16 b)
 *       description: >-
 *         All preconditions (item 14) are checked together before any tx/partner call — a single 400
 *         with the full `faltantes` list. Creates SENT + attempt 1 per document, consumes the DPS
 *         sequence, audits dfe.emitted, then calls the partner post-commit. NF-e/NFC-e (kind=NFE|NFCE) is
 *         rejected loud until the BE-INCR-NFCE assembly (Fase C) lands.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, saleId, kind]
 *               properties:
 *                 unitId: { type: string }
 *                 saleId: { type: string }
 *                 kind: { type: string, enum: [NFSE, NFE, NFCE] }
 *       responses:
 *         '200': { description: 'FiscalDocumentView[] — um por cTribNac distinto da venda' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *     get:
 *       summary: List fiscal documents (filter by saleId and/or status)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: saleId, required: false, schema: { type: string } }
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [SENT, PROCESSING, AUTHORIZED, REJECTED, CANCELLED] } }
 *         - { in: query, name: pendencias, required: false, schema: { type: boolean }, description: 'item 30 — true filtra só documentos com pendências; exige saleId ou status junto' }
 *       responses:
 *         '200': { description: 'FiscalDocumentView[]' }
 *         '400': { description: 'nem saleId nem status informados' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/nfe/dfe/documents/{id}:
 *     get:
 *       summary: Read one fiscal document with its attempts
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'FiscalDocumentView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/nfe/dfe/documents/{id}/consultar:
 *     post:
 *       summary: Re-query the partner for one document's current result (item 27, manual re-check)
 *       description: >-
 *         No-op (devolve a view atual) se o documento já estiver num status terminal
 *         (AUTHORIZED/REJECTED/CANCELLED) — só SENT/PROCESSING são re-consultados.
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
 *         '200': { description: 'FiscalDocumentView (atualizada, se houve transição)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/nfe/dfe/documents/{id}/reenviar:
 *     post:
 *       summary: Resend a REJECTED document as a new attempt (item 26)
 *       description: >-
 *         Só de status REJECTED. Payload remontado (perfil/venda corrigidos), tentativa n+1 com ref
 *         novo; a tentativa n permanece intacta. A numeração da DPS NÃO é reconsumida.
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
 *         '200': { description: 'FiscalDocumentView (status SENT, nova tentativa)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/nfe/dfe/documents/{id}/cancelar:
 *     post:
 *       summary: Cancel an AUTHORIZED document (item 29, Anexo II e101101)
 *       description: >-
 *         409: OUT_OF_WINDOW (E0822) ou REJECTED pelo parceiro (código do fisco na mensagem)
 *         Só de status AUTHORIZED. Nunca toca a venda nem o razão. OUT_OF_WINDOW/REJECTED do
 *         parceiro viram 409 tipado; CANCELLED retira a proveniência anexada (F-DFE-18, soft-delete).
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
 *               required: [unitId, cMotivo, xMotivo]
 *               properties:
 *                 unitId: { type: string }
 *                 cMotivo: { type: integer, enum: [1, 2, 9], description: '1 erro na emissão | 2 serviço não prestado | 9 outros' }
 *                 xMotivo: { type: string, minLength: 15, maxLength: 255 }
 *       responses:
 *         '200': { description: "FiscalDocumentView (status CANCELLED) + avisos (['fora_da_janela_configurada'] quando passou do prazo configurado no perfil — só aviso, BE-INCR-DFE-EVENTOS item 5)" }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/nfe/dfe/documents/{id}/substituir:
 *     post:
 *       summary: Substitute an authorized NFS-e (BE-INCR-DFE-EVENTOS item 11, DPS with infDPS/subst)
 *       description: >-
 *         409: DFE_STATUS_INVALIDO | DFE_SUBSTITUICAO_EXISTENTE | DFE_SUBST_FORA_DO_TETO | DFE_SUBST_NAO_SUPORTADA
 *         Cria o documento substituto (DPS nova com o grupo subst apontando a chave da original; Anexo I [113]-[116]).
 *         Quando a substituta é autorizada, a original vira CANCELLED na mesma transação (e105102 gerado pelo fisco).
 *         Fora do prazo do município configurado no perfil e cMotivo fora de 01/02 só gera aviso (E0050, nível 3).
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
 *               required: [unitId, cMotivo]
 *               properties:
 *                 unitId: { type: string }
 *                 cMotivo: { type: string, enum: ['01', '02', '03', '04', '05', '99'], description: 'TSCodJustSubst (XSD 1.01)' }
 *                 xMotivo: { type: string, minLength: 15, maxLength: 255, description: 'obrigatório com cMotivo 99 (RN E0078)' }
 *       responses:
 *         '201': { description: 'FiscalDocumentView da substituta (SENT) + avisos' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *         '422': { description: 'SUBSTITUICAO_BLOQUEADA — muda campo congelado por E0060/E0061' }
 *
 *   /api/nfe/dfe/documents/{id}/ficha:
 *     get:
 *       summary: DPS of the current attempt, raw, for the manual-mode form (BE-INCR-DFE-MANUAL item 14)
 *       description: >-
 *         Devolve a DPS da tentativa corrente sem formatação (a máscara, a vírgula decimal e a ordem das etapas do
 *         portal são da tela). Contém dado do tomador: só com canReadFiscalDocument.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: '{ documentId, status, currentAttemptNo, payload }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/nfe/dfe/documents/{id}/retorno-manual:
 *     post:
 *       summary: Register the authorized NFS-e XML downloaded from the public portal (manual mode, item 11)
 *       description: >-
 *         409: documento não é do modo manual ou não está SENT/PROCESSING
 *         Só documento do modo manual (partner=manual) em SENT/PROCESSING. O XML tem a assinatura conferida (E1630/E1634),
 *         é relido contra a DPS enviada e autoriza o documento. Identidade divergente (prestador, chave já usada, nota
 *         anterior ao documento, origem fora do portal) ⇒ 422 sem escrita. Conteúdo divergente ⇒ AUTHORIZED_DIVERGENT
 *         (só sai cancelando).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               required: [unitId, file]
 *               properties:
 *                 unitId: { type: string }
 *                 file: { type: string, format: binary, description: 'XML da NFS-e autorizada' }
 *                 pdf: { type: string, format: binary, description: 'DANFSe (opcional)' }
 *       responses:
 *         '200': { description: 'FiscalDocumentView (AUTHORIZED ou AUTHORIZED_DIVERGENT) + releitura' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *         '422': { description: 'XML inválido, assinatura inválida ou identidade divergente' }
 *
 *   /api/nfe/dfe/documents/{id}/rejeicao-manual:
 *     post:
 *       summary: Register that the public portal rejected the data (manual mode, item 12)
 *       description: "409: documento não é do modo manual ou não está SENT/PROCESSING"
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
 *               required: [unitId, errors]
 *               properties:
 *                 unitId: { type: string }
 *                 errors:
 *                   type: array
 *                   minItems: 1
 *                   maxItems: 20
 *                   items:
 *                     type: object
 *                     required: [code, message]
 *                     properties:
 *                       code: { type: string, maxLength: 20 }
 *                       message: { type: string, maxLength: 500 }
 *       responses:
 *         '200': { description: 'FiscalDocumentView (status REJECTED)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/nfe/dfe/documents/{id}/cancelamento-manual:
 *     post:
 *       summary: Register a cancellation done on the public portal, with the e101101 event XML (manual mode, item 13)
 *       description: >-
 *         409: documento não é do modo manual ou não está autorizado
 *         Só documento do modo manual autorizado. O evento tem de cancelar esta chave (chNFSe) e o cMotivo tem de ser o
 *         do evento; o texto gravado é o do XML. Nunca toca a venda nem o razão; retira a proveniência.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               required: [unitId, cMotivo, xMotivo, file]
 *               properties:
 *                 unitId: { type: string }
 *                 cMotivo: { type: integer, enum: [1, 2, 9] }
 *                 xMotivo: { type: string, minLength: 15, maxLength: 255 }
 *                 file: { type: string, format: binary, description: 'XML do evento de cancelamento e101101' }
 *       responses:
 *         '200': { description: 'FiscalDocumentView (status CANCELLED)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *         '422': { description: 'evento inválido, de outra NFS-e ou com cMotivo diferente' }
 *
 *   /api/nfe/dfe/webhook/{partner}:
 *     post:
 *       summary: Partner webhook — wakes up a re-query, never transitions state directly (item 28, F-DFE-12)
 *       description: >-
 *         Rota PÚBLICA (publicApiRoutes) — sem Bearer. Assinatura inválida, `:partner` diferente do
 *         parceiro habilitado, ou adaptador sem capabilities.webhook ⇒ 401 sem efeito (0 escrita).
 *         Null/File (os únicos adaptadores deste BRIEF) ⇒ 401 sempre — nenhum tem webhook real.
 *       tags: [Accounting]
 *       security: []
 *       parameters:
 *         - { in: path, name: partner, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'assinatura válida — re-consulta disparada (ou nada a fazer)' }
 *         '401': { description: 'assinatura inválida / parceiro não habilitado / sem capability de webhook' }
 */
export {};
