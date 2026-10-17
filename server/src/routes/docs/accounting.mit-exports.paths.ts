/**
 * OpenAPI de /api/accounting/mit-exports.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/mit-exports:
 *     post:
 *       summary: Generate the MIT import JSON file of a month (BE-INCR-MIT-EXPORT PR-2, X9 items 10-12)
 *       description: >-
 *         409: MIT_LC224_LIMINAR
 *         Monta o arquivo JSON de importação do MIT (leiaute 1.0) do PA (ano, mês) a partir das apurações de
 *         IRPJ/CSLL confirmadas e registra a geração (hash + ids, sem conteúdo nem CPF). O arquivo só sai nesta
 *         resposta. 400 - perfil do ano ausente, SIMPLES/MEI, sem CNPJ do declarante, sem contador ativo. 409 -
 *         liminar contra a LC 224 no perfil. 422 - nenhuma apuração confirmada ou nenhum débito no mês.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [unitId, anoCalendario, mes]
 *               properties:
 *                 unitId:        { type: string, minLength: 1 }
 *                 anoCalendario: { type: integer, minimum: 2025 }
 *                 mes:           { type: integer, minimum: 1, maximum: 12 }
 *       responses:
 *         '201': { description: 'MitExportCreatedView (id, nomeArquivo, conteudo, sha256, avisos)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *         '422': { description: 'MIT_NADA_A_EXPORTAR' }
 *     get:
 *       summary: List the MIT files generated in a year, with the staleness flag (X9 items 11-12)
 *       description: >-
 *         defasado = true quando alguma apuração exportada deixou de estar confirmada ou há confirmada nova no PA.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: anoCalendario, required: true, schema: { type: integer, minimum: 2025 } }
 *       responses:
 *         '200': { description: 'MitExportView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 */
export {};
