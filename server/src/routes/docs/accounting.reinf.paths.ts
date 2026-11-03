/**
 * OpenAPI de /api/accounting/reinf/batches (BE-INCR-EFD-REINF PR-1).
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/reinf/batches:
 *     post:
 *       summary: Generate the EFD-Reinf batch of a month (BE-INCR-EFD-REINF PR-1 items 4-14, PR-2 items 15-18, PR-3 items 21-23)
 *       description: >-
 *         Monta o lote da EFD-Reinf (leiaute 2.1.2b; R-1000 quando preciso, R-2010 por prestador de cessão de mão de obra,
 *         R-4010 por sócio PF (dividendos e JCP), R-4020 por fornecedor PJ e sócio PJ com JCP, R-2099 e R-4099) a partir
 *         das retenções feitas e das distribuições POSTED da PJ inteira, sem assinatura, e registra a geração (hash + ids, sem XML nem CPF/CNPJ). O
 *         XML e o relatório de conferência saem nesta resposta e, desde o PR-3, também como 2 jobs de export (EXPORT_REINF com o
 *         sha256 do lote; EXPORT_REINF_RELATORIO), extras do pacote do contador (exportJobIds). O relatório traz o prazo por
 *         linha (trimestral só no R-4010 inteiramente de isenção 12) e avisos com código. 400 - competência futura (REINF_COMPETENCIA_FUTURA),
 *         perfil do ano ausente, CNPJ do fornecedor inválido (REINF_BENEFICIARIO_CNPJ_INVALIDO), natureza do rendimento
 *         sem mapa (NATUREZA_RENDIMENTO_SEM_MAPA), CPF do sócio inválido (REINF_BENEFICIARIO_CPF_INVALIDO), sócio removido
 *         com JCP (REINF_SOCIO_REMOVIDO), R-2010 sem série/número/tipo de serviço/CPRB (REINF_R2010_CAMPO_AUSENTE),
 *         prestador sem CNPJ (REINF_PRESTADOR_CNPJ_INVALIDO), CPRB divergente (REINF_R2010_CPRB_DIVERGENTE), cadastro do R-1000 incompleto (REINF_SEM_CNPJ_DECLARANTE,
 *         REINF_SEM_CONTATO, REINF_CLASSTRIB_PENDENTE, REINF_ECD_INDEFINIDA), limites do XSD (REINF_*_ACIMA_DO_LIMITE).
 *         422 - REINF_SEM_FATO (dispensada sem fato) ou REINF_SEM_EVENTO_GERAVEL.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [unitId, competencia]
 *               properties:
 *                 unitId:      { type: string, minLength: 1 }
 *                 competencia: { type: string, pattern: '^\d{4}-(0[1-9]|1[0-2])$' }
 *       responses:
 *         '201': { description: 'ReinfBatchCreated (batchId, sha256, xml, relatorio, exportJobIds)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *         '422': { description: 'REINF_SEM_FATO | REINF_SEM_EVENTO_GERAVEL' }
 *     get:
 *       summary: List the EFD-Reinf batches of a month, with the staleness flag (EFD-REINF items 11, 13)
 *       description: >-
 *         defasado = true quando alguma retenção de origem do lote foi estornada depois da geração.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: competencia, required: true, schema: { type: string, pattern: '^\d{4}-(0[1-9]|1[0-2])$' } }
 *       responses:
 *         '200': { description: 'ReinfBatchView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *   /api/accounting/reinf/batches/{id}:
 *     get:
 *       summary: Read one EFD-Reinf batch record, without the XML (EFD-REINF item 11)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'ReinfBatchView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { description: 'Lote ou unidade não encontrados' }
 */
export {};
