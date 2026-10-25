/**
 * OpenAPI das retenções na fonte (BE-INCR-RETENCOES-FONTE). PR-1: perfil de retenção (item 6) e o comando de regime da
 * contraparte (item 5). Um arquivo por feature (dono, 2026-10-16).
 * @openapi
 * paths:
 *   /api/accounting/withholding-profiles:
 *     get:
 *       summary: List the live withholding profiles of the unit (optionally of one counterparty)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: counterpartyId, required: false, schema: { type: string } }
 *       responses:
 *         '200': { description: 'WithholdingProfileView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     post:
 *       summary: Create a withholding profile (counterparty × service nature)
 *       description: >-
 *         issRetido requires issCodMun and issAliquotaBp; inss requires inssTpServico; irrf or csrf requires natRend, which must
 *         be in the EFD-Reinf Table 01 (NATUREZA_RENDIMENTO) in force on vigenteDesde (a DRAFT-only natRend is accepted with
 *         the warning NATUREZA_RENDIMENTO_DRAFT). A PF counterparty only accepts irrf. Overlapping validity for the same
 *         counterparty and nature → 409 VIGENCIA_SOBREPOSTA. Audited as withholding_profile.created without taxId or name.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, counterpartyId, naturezaServico, irrf, csrf, inss, issRetido, fonte, vigenteDesde]
 *               properties:
 *                 unitId: { type: string }
 *                 counterpartyId: { type: string }
 *                 naturezaServico: { type: string, enum: [SERVICO_PROFISSIONAL, LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO, COMISSAO_PROPAGANDA, CESSAO_MAO_DE_OBRA, TRABALHO_NAO_ASSALARIADO_PF, OUTRO] }
 *                 natRend: { type: string, nullable: true, description: '5 digits (EFD-Reinf Table 01)' }
 *                 irrf: { type: boolean }
 *                 csrf: { type: boolean }
 *                 inss: { type: boolean }
 *                 issRetido: { type: boolean }
 *                 inssTpServico: { type: string, nullable: true, description: '9 digits (EFD-Reinf Table 06)' }
 *                 inssCprb: { type: boolean, nullable: true }
 *                 issCodMun: { type: string, nullable: true, description: 'IBGE, 7 digits' }
 *                 issAliquotaBp: { type: integer, nullable: true, minimum: 0, maximum: 10000 }
 *                 issVencimentoDia: { type: integer, nullable: true, minimum: 1, maximum: 31 }
 *                 fonte: { type: string, description: 'cited legal basis, e.g. "RIR/2018 art. 714 § 1º XX"' }
 *                 vigenteDesde: { type: string, format: date }
 *                 vigenteAte: { type: string, format: date, nullable: true }
 *       responses:
 *         '201': { description: 'WithholdingProfileView (with avisos)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { description: 'unit or counterparty not found in the scope' }
 *         '409': { description: 'VIGENCIA_SOBREPOSTA or deleted unit' }
 *
 *   /api/accounting/withholding-profiles/{id}:
 *     get:
 *       summary: Read one withholding profile
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'WithholdingProfileView' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     patch:
 *       summary: Replace a withholding profile (full body, same rules as POST; counterpartyId does not change)
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
 *               required: [unitId, naturezaServico, irrf, csrf, inss, issRetido, fonte, vigenteDesde]
 *       responses:
 *         '200': { description: 'WithholdingProfileView (with avisos)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { description: 'VIGENCIA_SOBREPOSTA or deleted unit' }
 *     delete:
 *       summary: Soft-delete a withholding profile
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'deleted' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/counterparties/{id}/regime:
 *     post:
 *       summary: Set the tax regime and the Simples opt-in declaration of a counterparty (command)
 *       description: >-
 *         RETENCOES-FONTE item 5 (F-RET-5 a). regimeTributario null clears it. PF requires a CPF (11-digit taxId) → otherwise
 *         400. declaracaoOptanteDocumentId must be a live SourceDocument of the same unit. Audited as counterparty.regime_set
 *         without taxId or name.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SetCounterpartyRegimeInput' }
 *       responses:
 *         '200': { description: 'Counterparty' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { description: 'counterparty not found in the scope' }
 */
export {};
